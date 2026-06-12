import defaultSources from "../config/sources.json" with { type: "json" };
import defaultPreferences from "../config/preferences.json" with { type: "json" };
import { fetchSource } from "./sources.js";
import { mergeEvents, upcomingEvents } from "./events.js";

// Static imports keep the config files inside the serverless bundle; reading
// them from disk at runtime fails on Vercel because they are never traced.
export function loadConfig() {
  return { sources: defaultSources, preferences: defaultPreferences };
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
