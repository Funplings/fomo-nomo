import test from "node:test";
import assert from "node:assert/strict";
import { buildCustomDigest, loadConfig } from "../src/core.js";

test("Square fetches every page with no upper date bound", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    const nextPage = Boolean(body.cursor);
    return Response.json({
      class_schedule_instances: [{
        id: nextPage ? "distant" : "near",
        class_schedule_id: "class",
        start_at: nextPage ? "2099-12-01T18:00:00Z" : "2099-01-01T18:00:00Z"
      }],
      included_resources: { class_schedules: [{ id: "class", name: "Class", duration_minutes: 60 }] },
      ...(nextPage ? {} : { cursor: "page-2" })
    });
  });
  const result = await buildCustomDigest([{
    id: "square", name: "Studio", lookaheadDays: 1,
    url: "https://book.squareup.com/classes/widget/location/unit/classes"
  }], new Date("2098-12-01"));
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.events.map((event) => event.id), ["near", "distant"]);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].cursor, "page-2");
  for (const request of requests) {
    assert.deepEqual(Object.keys(request.query.filter.starting_at), ["start_at"]);
  }
});

test("Eventbrite follows pagination through distant future events", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(url);
    const page = Number(new URL(url).searchParams.get("page"));
    return Response.json({
      events: [{ id: String(page), name: "Event", start_date: `2099-0${page}-01`, start_time: "18:00:00" }],
      hasMore: page < 2
    });
  });
  const result = await buildCustomDigest([{
    id: "eventbrite", name: "Organizer", url: "https://www.eventbrite.com/o/organizer-123"
  }]);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.events.map((event) => event.id), ["1", "2"]);
  assert.equal(requests.length, 2);
});

test("JSON-LD sources retain distant events and exclude past events", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(
    '<script type="application/ld+json">' + JSON.stringify([
      { "@type": "Event", name: "Past", startDate: "2020-01-01" },
      { "@type": "Event", name: "Distant", startDate: "2099-01-01" }
    ]) + '</script>'
  ));
  const result = await buildCustomDigest([{ id: "luma", name: "Calendar", url: "https://luma.com/calendar" }]);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.events.map((event) => event.title), ["Distant"]);
  assert.deepEqual(Object.keys(loadConfig()), ["sources"]);
});
