import { createServer } from "node:http";
import { buildCustomDigest, buildDigest, ingest, loadConfig } from "./app.js";
import { inferSourceType } from "./sources.js";
import { renderWebApp } from "./web.js";

const port = Number(process.env.PORT || 3100);
const supportedHosts = new Set(["book.squareup.com", "luma.com", "partiful.com", "www.partiful.com", "eventbrite.com", "www.eventbrite.com"]);

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 100_000) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function cleanCustomSources(sources) {
  if (!Array.isArray(sources) || sources.length > 20) throw new Error("Provide up to 20 sources.");
  return sources.map((source, index) => {
    const url = new URL(String(source.url || ""));
    if (url.protocol !== "https:" || !supportedHosts.has(url.hostname)) {
      throw new Error(`Source ${index + 1} must use a supported public provider.`);
    }
    return {
      id: String(source.id || `source-${index + 1}`).slice(0, 100),
      name: String(source.name || url.hostname).slice(0, 100),
      url: url.toString(),
      type: inferSourceType(url.toString()),
      enabled: source.enabled !== false,
      categories: Array.isArray(source.categories) ? source.categories.map(String).slice(0, 10) : []
    };
  });
}

function cleanPreferences(preferences = {}) {
  return {
    lookaheadDays: Math.min(60, Math.max(1, Number(preferences.lookaheadDays) || 14)),
    favoriteCategories: Array.isArray(preferences.favoriteCategories) ? preferences.favoriteCategories.map(String).slice(0, 20) : [],
    blockedCategories: Array.isArray(preferences.blockedCategories) ? preferences.blockedCategories.map(String).slice(0, 20) : []
  };
}

const server = createServer(async (request, response) => {
  try {
    if (request.url === "/api/events" && request.method === "GET") {
      const { events } = await buildDigest();
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(events, null, 2));
      return;
    }
    if (request.url === "/api/events" && request.method === "POST") {
      const body = await readJson(request);
      const result = await buildCustomDigest(cleanCustomSources(body.sources), cleanPreferences(body.preferences));
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(result));
      return;
    }
    if (request.url === "/api/ingest" && request.method === "POST") {
      const result = await ingest();
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ imported: result.imported, stored: result.events.length, failures: result.failures }));
      return;
    }
    if (request.url === "/") {
      const defaults = await loadConfig();
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(renderWebApp(defaults));
      return;
    }
    if (request.url === "/digest") {
      const { html } = await buildDigest();
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(html);
      return;
    }
    response.statusCode = 404;
    response.end("Not found");
  } catch (error) {
    response.statusCode = error instanceof SyntaxError || /Provide|Source|supported|large/.test(error.message) ? 400 : 500;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(port, () => console.log(`Event digest running at http://localhost:${port}`));
