import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { readFile } from "node:fs/promises";

process.env.VERCEL = "1";
const { handler } = await import("../src/server.js");

async function request(url, method = "POST", body = { sources: [] }) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.url = url;
  req.method = method;
  const response = {
    statusCode: 200, headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = value; }
  };
  await handler(req, response);
  return response;
}

test("events work with the original path and Vercel's rewritten destination", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url)));
  const rewrite = config.rewrites.find(route => route.source === "/api/events");
  for (const path of ["/api/events", rewrite.destination]) {
    const response = await request(path);
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "application/json");
    assert.deepEqual(JSON.parse(response.body), { events: [], failures: [] });
  }
});

test("home works with the original path and Vercel's rewritten destination", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url)));
  const rewrite = config.rewrites.find(route => route.source === "/");
  for (const path of ["/", rewrite.destination]) {
    const response = await request(path, "GET");
    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"], /text\/html/);
    assert.match(response.body, /<title>fomo-nomo<\/title>/);
  }
});

test("unknown routes and invalid source requests return JSON errors", async () => {
  const missing = await request("/missing");
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(JSON.parse(missing.body), { error: "Not found" });
  const invalid = await request("/api?route=events", "POST", { sources: [{}] });
  assert.ok(invalid.statusCode >= 400);
  assert.ok(JSON.parse(invalid.body).error);
});
