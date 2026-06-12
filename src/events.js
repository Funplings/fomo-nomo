import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "..");
const dataPath = path.join(root, "data", "events.json");

export function fingerprint(event) {
  const key = [
    event.title,
    event.venue,
    new Date(event.start).toISOString().slice(0, 16)
  ].map((value) => String(value || "").toLowerCase().replace(/\W/g, "")).join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 20);
}

export function normalizeEvent(raw, source) {
  if (!raw.title || !raw.start) return null;
  const start = new Date(raw.start);
  if (Number.isNaN(start.valueOf())) return null;

  const event = {
    title: String(raw.title).trim(),
    description: String(raw.description || "").trim(),
    venue: String(raw.venue || source.name).trim(),
    address: String(raw.address || "").trim(),
    start: start.toISOString(),
    end: raw.end && !Number.isNaN(new Date(raw.end).valueOf()) ? new Date(raw.end).toISOString() : null,
    url: String(raw.url || source.url || "").trim(),
    price: String(raw.price || "").trim(),
    categories: [...new Set([...(source.categories || []), ...(raw.categories || [])])],
    sourceId: source.id,
    sourceName: source.name
  };

  return { ...event, id: raw.id || fingerprint(event) };
}

export async function loadEvents() {
  try {
    return JSON.parse(await readFile(dataPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function saveEvents(events) {
  await mkdir(path.dirname(dataPath), { recursive: true });
  await writeFile(dataPath, `${JSON.stringify(events, null, 2)}\n`);
}

export function mergeEvents(existing, incoming) {
  const merged = new Map(existing.map((event) => [event.id, event]));
  for (const event of incoming) {
    merged.set(event.id, { ...merged.get(event.id), ...event, updatedAt: new Date().toISOString() });
  }
  return [...merged.values()].sort((a, b) => new Date(a.start) - new Date(b.start));
}

export function upcomingEvents(events, preferences, now = new Date()) {
  const end = new Date(now);
  end.setDate(end.getDate() + (preferences.lookaheadDays || 14));
  const favorites = new Set(preferences.favoriteCategories || []);
  const blocked = new Set(preferences.blockedCategories || []);

  return events
    .filter((event) => {
      const start = new Date(event.start);
      return start >= now && start <= end && !event.categories.some((category) => blocked.has(category));
    })
    .map((event) => ({
      ...event,
      score: event.categories.reduce((score, category) => score + (favorites.has(category) ? 3 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score || new Date(a.start) - new Date(b.start));
}
