import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchSource } from "./sources.js";
import { loadEvents, mergeEvents, root, saveEvents, upcomingEvents } from "./events.js";
import { renderDigest } from "./digest.js";

export async function loadConfig() {
  const [sources, preferences] = await Promise.all([
    readFile(path.join(root, "config", "sources.json"), "utf8"),
    readFile(path.join(root, "config", "preferences.json"), "utf8")
  ]);
  return { sources: JSON.parse(sources), preferences: JSON.parse(preferences) };
}

export async function ingest() {
  const { sources } = await loadConfig();
  const enabledSources = sources.filter((source) => source.enabled);
  const enabledSourceIds = new Set(enabledSources.map((source) => source.id));
  const results = await Promise.allSettled(enabledSources.map(fetchSource));
  const incoming = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const failures = results.filter((result) => result.status === "rejected").map((result) => result.reason.message);
  const existing = (await loadEvents()).filter((event) => enabledSourceIds.has(event.sourceId));
  const events = mergeEvents(existing, incoming);
  await saveEvents(events);
  return { events, imported: incoming.length, failures };
}

export async function buildDigest(now = new Date()) {
  const { preferences } = await loadConfig();
  const events = upcomingEvents(await loadEvents(), preferences, now);
  return { events, preferences, html: renderDigest(events, preferences, now) };
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

export async function sendDigest() {
  const { html, preferences, events } = await buildDigest();
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.DIGEST_TO;
  const from = process.env.DIGEST_FROM || "Event Digest <onboarding@resend.dev>";
  if (!apiKey || !to) throw new Error("Set RESEND_API_KEY and DIGEST_TO before sending.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: `What's Happening? ${events.length} upcoming events`, html })
  });
  if (!response.ok) throw new Error(`Resend failed: ${response.status} ${await response.text()}`);
  return response.json();
}
