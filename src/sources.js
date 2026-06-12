import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeEvent, root } from "./events.js";

export function inferSourceType(url = "") {
  if (/book\.squareup\.com\/classes\//i.test(url)) return "square";
  if (/partiful\.com\/u\//i.test(url)) return "partiful";
  if (/eventbrite\.com\/o\//i.test(url)) return "eventbrite";
  if (/\.ics(?:[?#]|$)/i.test(url)) return "ics";
  if (/\.json(?:[?#]|$)/i.test(url)) return "json";
  return "jsonld";
}

function unfoldIcs(text) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function icsDate(value) {
  if (!value) return null;
  const clean = value.replace(/^.*:/, "");
  if (/^\d{8}$/.test(clean)) return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00`;
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${match[7]}` : clean;
}

function unescapeIcs(value = "") {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

export function parseIcs(text) {
  return unfoldIcs(text).split("BEGIN:VEVENT").slice(1).map((block) => {
    const fields = Object.fromEntries(block.split(/\r?\n/).map((line) => {
      const separator = line.indexOf(":");
      return separator < 0 ? [line, ""] : [line.slice(0, separator).split(";")[0], line.slice(separator + 1)];
    }));
    return {
      id: fields.UID,
      title: unescapeIcs(fields.SUMMARY),
      description: unescapeIcs(fields.DESCRIPTION),
      venue: unescapeIcs(fields.LOCATION),
      start: icsDate(fields.DTSTART),
      end: icsDate(fields.DTEND),
      url: fields.URL
    };
  });
}

function findJsonLd(value, events = []) {
  if (Array.isArray(value)) value.forEach((item) => findJsonLd(item, events));
  else if (value && typeof value === "object") {
    const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
    if (types.includes("Event")) events.push(value);
    Object.values(value).forEach((item) => findJsonLd(item, events));
  }
  return events;
}

export function parseJsonLd(html) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return scripts.flatMap((match) => {
    try {
      return findJsonLd(JSON.parse(match[1])).map((event) => ({
        title: event.name,
        description: event.description,
        venue: event.location?.name,
        address: typeof event.location?.address === "string"
          ? event.location.address
          : [
              event.location?.address?.streetAddress,
              event.location?.address?.addressLocality,
              event.location?.address?.addressRegion
            ].filter(Boolean).join(", "),
        start: event.startDate,
        end: event.endDate,
        url: event.url,
        price: Array.isArray(event.offers)
          ? event.offers.some((offer) => Number(offer.price) === 0) ? "Free" : event.offers[0]?.price ? `$${event.offers[0].price}` : ""
          : event.offers?.price === 0 ? "Free" : event.offers?.price ? `$${event.offers.price}` : "",
        categories: event.keywords ? String(event.keywords).split(",").map((item) => item.trim()) : []
      }));
    } catch {
      return [];
    }
  });
}

export function parseSquareClasses(payload, source) {
  const schedules = new Map(
    (payload.included_resources?.class_schedules || []).map((schedule) => [schedule.id, schedule])
  );
  const baseUrl = source.url.replace(/\/classes\/?$/, "");

  return (payload.class_schedule_instances || []).map((instance) => {
    const schedule = schedules.get(instance.class_schedule_id);
    if (!schedule) return null;
    const start = new Date(instance.start_at);
    const end = new Date(start.valueOf() + schedule.duration_minutes * 60_000);
    const price = Number(schedule.price_amount || 0);

    return {
      id: instance.id,
      title: schedule.name,
      description: schedule.description,
      venue: source.name,
      address: source.address,
      start: start.toISOString(),
      end: end.toISOString(),
      url: `${baseUrl}/classDetails/${schedule.id}?dateStart=${Math.floor(start.valueOf() / 1000)}`,
      price: price ? `$${(price / 100).toFixed(2)}` : "Free",
      categories: source.classCategories || []
    };
  }).filter(Boolean);
}

export function parsePartifulEvents(payload, source, now = new Date()) {
  const end = new Date(now);
  end.setDate(end.getDate() + (source.lookaheadDays || 60));

  return (payload.result?.data || []).filter((event) => {
    const start = new Date(event.startDate);
    return start >= now && start <= end && event.status === "PUBLISHED";
  }).map((event) => ({
    id: event.id,
    title: event.title,
    venue: source.name,
    address: source.address,
    start: event.startDate,
    end: event.endDate,
    url: `https://partiful.com/e/${event.id}`,
    price: event.ticketing?.price ? `$${Number(event.ticketing.price).toFixed(2)}` : "",
    categories: source.eventCategories || []
  }));
}

export function parseEventbriteEvents(events, source, now = new Date()) {
  const end = new Date(now);
  end.setDate(end.getDate() + (source.lookaheadDays || 60));

  return events.filter((event) => {
    const start = new Date(`${event.start_date}T${event.start_time}`);
    return !event.is_cancelled && start >= now && start <= end;
  }).map((event) => {
    const ticket = event.ticket_availability;
    const amount = Number(ticket?.minimum_ticket_price?.major_value);
    const price = ticket?.is_free
      ? "Free"
      : amount > 0
        ? `$${amount.toFixed(2)}`
        : ticket?.minimum_ticket_price?.display || "";

    return {
      id: event.id,
      title: event.name,
      description: event.summary,
      venue: event.primary_venue?.name || source.name,
      address: event.primary_venue?.address?.localized_address_display || source.address,
      start: `${event.start_date}T${event.start_time}`,
      end: event.end_date && event.end_time ? `${event.end_date}T${event.end_time}` : null,
      url: event.url,
      price,
      categories: source.eventCategories || []
    };
  });
}

async function readSource(source) {
  if (source.url) {
    const response = await fetch(source.url, { headers: { "user-agent": "FomoNomo/0.1" } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.text();
  }
  return readFile(path.join(root, source.path), "utf8");
}

async function fetchSquareSource(source) {
  const match = source.url.match(/\/classes\/([^/]+)\/location\/([^/]+)\/classes/);
  if (!match) throw new Error("Square source URL must be a Square classes listing URL");
  const [, widgetId, locationId] = match;
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + (source.lookaheadDays || 60));
  const apiUrl = `https://app.squareup.com/appointments/api/buyer/classes/class_schedule_instances/search?unit_token=${locationId}`;
  const rawEvents = [];
  let cursor;

  do {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        origin: "https://book.squareup.com",
        referer: `https://book.squareup.com/classes/${widgetId}/location/${locationId}/classes`,
        "user-agent": "FomoNomo/0.1"
      },
      body: JSON.stringify({
        ...(cursor ? { cursor } : {}),
        sort: { field: "START_AT" },
        query: {
          filter: {
            location_id: locationId,
            starting_at: { start_at: start.toISOString(), end_at: end.toISOString() },
            status: "CLASS_SCHEDULE_ACTIVE"
          }
        },
        includes: ["CLASS_SCHEDULE"],
        limit: 100
      })
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const payload = await response.json();
    rawEvents.push(...parseSquareClasses(payload, source));
    cursor = payload.cursor;
  } while (cursor);

  return rawEvents;
}

async function fetchPartifulSource(source) {
  const match = source.url.match(/partiful\.com\/u\/([^/?#]+)/);
  if (!match) throw new Error("Partiful source URL must be a public Partiful profile URL");
  const response = await fetch("https://api.partiful.com/getPublishedEvents", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ data: { params: { userId: match[1] } } })
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return parsePartifulEvents(await response.json(), source);
}

async function fetchEventbriteSource(source) {
  const match = source.url.match(/eventbrite\.com\/o\/[^/?#]*-(\d+)/);
  if (!match) throw new Error("Eventbrite source URL must be a public Eventbrite organizer URL");
  const rawEvents = [];
  let page = 1;
  let hasMore;

  do {
    const apiUrl = `https://www.eventbrite.com/organizer-profile/api/organizers/${match[1]}/events/?page=${page}&pageSize=12`;
    const response = await fetch(apiUrl, { headers: { accept: "application/json", "user-agent": "FomoNomo/0.1" } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const payload = await response.json();
    rawEvents.push(...(payload.events || []));
    hasMore = payload.hasMore;
    page += 1;
  } while (hasMore);

  return parseEventbriteEvents(rawEvents, source);
}

export async function fetchSource(source) {
  const type = source.type || inferSourceType(source.url);
  if (type === "square") {
    return (await fetchSquareSource(source)).map((event) => normalizeEvent(event, source)).filter(Boolean);
  }
  if (type === "partiful") {
    return (await fetchPartifulSource(source)).map((event) => normalizeEvent(event, source)).filter(Boolean);
  }
  if (type === "eventbrite") {
    return (await fetchEventbriteSource(source)).map((event) => normalizeEvent(event, source)).filter(Boolean);
  }
  const text = await readSource(source);
  let rawEvents;
  if (type === "json") rawEvents = JSON.parse(text);
  else if (type === "ics") rawEvents = parseIcs(text);
  else if (type === "jsonld") rawEvents = parseJsonLd(text);
  else throw new Error(`Unsupported source type: ${type}`);
  return rawEvents.map((event) => normalizeEvent(event, source)).filter(Boolean);
}
