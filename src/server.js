import { createServer } from "node:http";
import { buildCustomDigest, loadConfig } from "./core.js";
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

export async function handler(request, response) {
  try {
    const { pathname, searchParams } = new URL(request.url, "http://localhost");
    // Vercel can pass the rewritten destination instead of the browser's path.
    const functionPath = pathname === "/api" || pathname === "/api/";
    const eventsRoute = pathname === "/api/events" ||
      (functionPath && searchParams.get("route") === "events");
    const homeRoute = pathname === "/" ||
      (functionPath && searchParams.get("route") === "home");
    if (eventsRoute && request.method === "POST") {
      const body = await readJson(request);
      const result = await buildCustomDigest(cleanCustomSources(body.sources));
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(result));
      return;
    }
    if (homeRoute && (request.method === "GET" || request.method === "HEAD")) {
      const defaults = loadConfig();
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(renderWebApp(defaults));
      return;
    }
    response.statusCode = 404;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    response.statusCode = error instanceof SyntaxError || /Provide|Source|supported|large/.test(error.message) ? 400 : 500;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ error: error.message }));
  }
}

// Vercel's Node backend build imports this module (via the package.json main
// field) and invokes the default export per request; locally we listen.
export default handler;

if (!process.env.VERCEL) {
  createServer(handler).listen(port, () => console.log(`fomo-nomo running at http://localhost:${port}`));
}
