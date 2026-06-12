import test from "node:test";
import assert from "node:assert/strict";
import { mergeEvents, normalizeEvent, upcomingEvents } from "../src/events.js";
import { inferSourceType, parseEventbriteEvents, parseIcs, parseJsonLd, parsePartifulEvents, parseSquareClasses } from "../src/sources.js";
import { renderDigest } from "../src/digest.js";

const source = { id: "venue", name: "Venue", categories: ["music"] };

test("normalizes and deduplicates events", () => {
  const first = normalizeEvent({ title: "A Show", venue: "Room", start: "2026-06-14T20:00:00Z" }, source);
  const second = normalizeEvent({ title: "A Show", venue: "Room", start: "2026-06-14T20:00:00Z", price: "$10" }, source);
  const merged = mergeEvents([first], [second]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].price, "$10");
});

test("ranks favorite categories", () => {
  const events = [
    normalizeEvent({ title: "Talk", start: "2026-06-14", categories: ["talk"] }, source),
    normalizeEvent({ title: "Film", start: "2026-06-15", categories: ["film"] }, source)
  ];
  const ranked = upcomingEvents(events, { lookaheadDays: 7, favoriteCategories: ["film"] }, new Date("2026-06-12"));
  assert.equal(ranked[0].title, "Film");
});

test("parses ICS and JSON-LD", () => {
  assert.equal(parseIcs("BEGIN:VEVENT\nUID:1\nDTSTART:20260614T200000Z\nSUMMARY:A Show\nEND:VEVENT")[0].title, "A Show");
  const html = '<script type="application/ld+json">{"@type":"Event","name":"A Talk","startDate":"2026-06-15","offers":[{"price":0}],"location":{"name":"Studio","address":{"streetAddress":"123 Main St","addressLocality":"Brooklyn","addressRegion":"NY"}}}</script>';
  const event = parseJsonLd(html)[0];
  assert.equal(event.title, "A Talk");
  assert.equal(event.price, "Free");
  assert.equal(event.address, "123 Main St, Brooklyn, NY");
});

test("infers supported source types", () => {
  assert.equal(inferSourceType("https://book.squareup.com/classes/x/location/y/classes"), "square");
  assert.equal(inferSourceType("https://partiful.com/u/example"), "partiful");
  assert.equal(inferSourceType("https://www.eventbrite.com/o/example-123"), "eventbrite");
  assert.equal(inferSourceType("https://luma.com/nyc-tech"), "jsonld");
});

test("parses Square class instances", () => {
  const payload = {
    class_schedule_instances: [{
      id: "instance-1",
      class_schedule_id: "schedule-1",
      start_at: "2026-06-20T18:00:00Z"
    }],
    included_resources: {
      class_schedules: [{
        id: "schedule-1",
        name: "Painting",
        description: "Make a painting.",
        duration_minutes: 120,
        price_amount: 2900
      }]
    }
  };
  const squareSource = {
    name: "Studio",
    address: "123 Main St",
    url: "https://book.squareup.com/classes/widget/location/unit/classes"
  };
  const event = parseSquareClasses(payload, squareSource)[0];
  assert.equal(event.id, "instance-1");
  assert.equal(event.end, "2026-06-20T20:00:00.000Z");
  assert.equal(event.price, "$29.00");
  assert.equal(event.url, "https://book.squareup.com/classes/widget/location/unit/classDetails/schedule-1?dateStart=1781978400");
});

test("parses upcoming Partiful profile events", () => {
  const payload = { result: { data: [
    { id: "old", title: "Old Event", startDate: "2026-06-01T18:00:00Z", status: "PUBLISHED" },
    { id: "next", title: "Next Event", startDate: "2026-06-20T18:00:00Z", status: "PUBLISHED", ticketing: { price: 10 } }
  ] } };
  const events = parsePartifulEvents(payload, { name: "Venue", lookaheadDays: 30 }, new Date("2026-06-12T00:00:00Z"));
  assert.equal(events.length, 1);
  assert.equal(events[0].title, "Next Event");
  assert.equal(events[0].price, "$10.00");
});

test("parses upcoming Eventbrite organizer events", () => {
  const payload = [
    { id: "old", name: "Old Event", start_date: "2026-06-01", start_time: "18:00:00" },
    {
      id: "next",
      name: "Next Event",
      summary: "A gathering.",
      start_date: "2026-06-20",
      start_time: "18:00:00",
      end_date: "2026-06-20",
      end_time: "20:00:00",
      url: "https://www.eventbrite.com/e/next",
      primary_venue: {
        name: "Nook",
        address: { localized_address_display: "45 Irving Ave, Brooklyn, NY" }
      },
      ticket_availability: {
        is_free: false,
        minimum_ticket_price: { major_value: "12.50", display: "12.50 USD" }
      }
    }
  ];
  const events = parseEventbriteEvents(payload, { name: "Nook", lookaheadDays: 30 }, new Date("2026-06-12T00:00:00"));
  assert.equal(events.length, 1);
  assert.equal(events[0].title, "Next Event");
  assert.equal(events[0].price, "$12.50");
  assert.equal(events[0].address, "45 Irving Ave, Brooklyn, NY");
});

test("renders a calendar digest", () => {
  const event = normalizeEvent({ title: "Painting", start: "2026-06-20T18:00:00Z" }, source);
  const html = renderDigest([event], {
    lookaheadDays: 14
  }, new Date("2026-06-12T12:00:00Z"));
  assert.match(html, /class="calendar"/);
  assert.match(html, /What's Happening\?/);
  assert.match(html, /Jun 20/);
  assert.match(html, /Painting/);
});
