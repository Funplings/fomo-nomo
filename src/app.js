import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchSource } from "./sources.js";
import { mergeEvents, root, upcomingEvents } from "./events.js";

export async function loadConfig() {
  const [sources, preferences] = await Promise.all([
    readFile(path.join(root, "config", "sources.json"), "utf8"),
    readFile(path.join(root, "config", "preferences.json"), "utf8")
  ]);
  return { sources: JSON.parse(sources), preferences: JSON.parse(preferences) };
}

export async function buildCustomDigest(sources, preferences, now = new Date()) {
  const enabledSources = sources.filter((source) => source.enabled !== false);
  const results = await Promise.allSettled(enabledSources.map(fetchSource));
  const incoming = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const failures = results.flatMap((result, index) => result.status === "rejected"
    ? [{ sourceId: enabledSources[index]?.id, message: result.reason.message }]
    : []);
  return { events: upcomingEvents(mergeEvents([], incoming), preferences, now), failures };
}
