import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { setImmediate } from "node:timers/promises";
import { renderWebApp } from "../src/web.js";

// Run the delivered client script with minimal DOM and storage substitutes.
async function loadApp(savedState, events = [], hash = "") {
  const html = renderWebApp({ sources: [] });
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, {
    value: "", hidden: false, innerHTML: "", textContent: "", style: {}, children: [],
    setAttribute(name, value) { this[name] = value; },
    append() {}, reset() {}, showModal() {}, close() {}, setCustomValidity() {}, reportValidity() {}, focus() {}, select() {}
  }]));
  const storage = new Map([["fomo-nomo-settings-v1", JSON.stringify(savedState)]]);
  const requests = [];
  const timers = new Map();
  let timerId = 0;
  const location = { href: "https://calendar.example/" + hash, hash };
  const context = vm.createContext({
    structuredClone, URL, Blob, Response, TextEncoder, CompressionStream, DecompressionStream, btoa, atob,
    location,
    history: { replaceState: (_, __, url) => { location.href = url; location.hash = new URL(url).hash; } },
    navigator: { clipboard: { writeText: async () => {} } },
    window: { addEventListener() {} },
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
    document: {
      getElementById: (id) => elements.get(id),
      createElement: () => ({ querySelector: () => ({ children: Array.from({ length: 7 }, () => ({ children: [{}, {}] })) }) })
    },
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    fetch: async (url, options) => {
      requests.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ events, failures: [] }) };
    }
  });
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  await vm.runInContext("ready", context);
  await setImmediate();
  return { location, html, elements, storage, requests, timers, run: (script) => vm.runInContext(script, context) };
}

test("editing a source URL preserves its identity and refreshes with the new URL", async () => {
  const app = await loadApp({
    sources: [{ id: "saved", name: "Old", url: "https://luma.com/old", type: "jsonld", color: "#6688c5", enabled: true, lookaheadDays: 1 }],
    preferences: { lookaheadDays: 1, blockedCategories: ["music"] }
  });
  assert.equal(app.elements.get("refresh").textContent, "Refresh");
  assert.match(app.html, /<title>fomo-nomo<\/title>/);
  assert.doesNotMatch(app.html, /id="days"|<h2>Settings<\/h2>/);
  app.run("openSourceDialog(0)");
  assert.equal(app.elements.get("source-url-field").hidden, false);
  assert.equal(app.elements.get("source-url").value, "https://luma.com/old");
  assert.match(app.html, /id="source-url"[^>]*required/);
  app.elements.get("source-url").value = "https://partiful.com/u/new";
  app.elements.get("source-name").value = "New";
  app.elements.get("source-form").onsubmit({ preventDefault() {}, target: app.elements.get("source-form") });
  await setImmediate();
  const saved = JSON.parse(app.storage.get("fomo-nomo-settings-v1"));
  assert.deepEqual(saved, { sources: [{
    id: "saved", name: "New", url: "https://partiful.com/u/new", color: "#6688c5", enabled: true
  }] });
  assert.equal(app.requests.length, 2);
  assert.deepEqual(app.requests[1], saved);
  assert.equal(app.elements.get("refresh").textContent, "Refresh");
});

test("calendar and mobile agenda include the latest event without preferences", async () => {
  const distant = new Date();
  distant.setFullYear(distant.getFullYear() + 1);
  const app = await loadApp({ sources: [] }, [{
    id: "distant", title: "Next year event", start: distant.toISOString(),
    url: "https://luma.com/event", venue: "Venue", categories: []
  }]);
  const calendar = app.elements.get("calendar").innerHTML;
  assert.equal((calendar.match(/Next year event/g) || []).length, 2);
  assert.equal(app.elements.get("summary").textContent, "1 upcoming event.");
  assert.equal(app.elements.get("status").textContent, "Updated just now");
});


test("undo restores consecutive removals in their original order and saves them", async () => {
  const sources = ["First", "Second", "Third"].map((name, index) => ({
    id: String(index), name, url: "https://luma.com/" + index, color: "#6688c5", enabled: index !== 1
  }));
  const app = await loadApp({ sources });
  app.run("removeSource(0);removeSource(0)");
  assert.equal(app.elements.get("undo-toast").hidden, false);
  assert.equal(app.elements.get("undo-message").textContent, "2 sources removed.");
  assert.equal(app.timers.size, 1);
  assert.equal([...app.timers.values()][0].delay, 10000);
  assert.deepEqual(JSON.parse(app.storage.get("fomo-nomo-settings-v1")).sources, [sources[2]]);
  app.elements.get("undo-remove").onclick();
  await setImmediate();
  assert.deepEqual(JSON.parse(app.storage.get("fomo-nomo-settings-v1")).sources, sources);
  assert.deepEqual(app.requests.at(-1).sources, sources);
  assert.equal(app.elements.get("undo-toast").hidden, true);
  assert.equal(app.timers.size, 0);
});

test("undo expires and does not restore a removed source after dismissal", async () => {
  const app = await loadApp({ sources: [{ id: "one", name: "One", url: "https://luma.com/one" }] });
  app.run("removeSource(0)");
  [...app.timers.values()][0].callback();
  assert.equal(app.elements.get("undo-toast").hidden, true);
  app.elements.get("undo-remove").onclick();
  assert.deepEqual(JSON.parse(app.storage.get("fomo-nomo-settings-v1")).sources, []);
  await setImmediate();
});

test("shared links restore sources in a fresh browser and take precedence over saved sources", async () => {
  const sources = [{ id: "original", name: "Art café", url: "https://luma.com/art", color: "#123456", enabled: false }];
  const author = await loadApp({ sources });
  await author.elements.get("share-calendar").onclick();
  const link = author.elements.get("share-link").value;
  assert.match(link, /#calendar=v1\./);
  assert.equal(link, author.location.href);
  const recipient = await loadApp({ sources: [] }, [], new URL(link).hash);
  assert.equal(recipient.requests.length, 1);
  assert.deepEqual(recipient.requests[0].sources, [{ ...sources[0], id: "shared-0", categories: [] }]);
  assert.deepEqual(JSON.parse(recipient.storage.get("fomo-nomo-settings-v1")), { sources: [] });
  await author.elements.get("copy-link").onclick();
  assert.equal(author.elements.get("share-status").textContent, "Link copied.");
});

test("invalid shared links keep saved sources and show an error without fetching", async () => {
  const saved = { sources: [{ id: "saved", name: "Saved", url: "https://luma.com/saved", color: "#6688c5" }] };
  const app = await loadApp(saved, [], "#calendar=v1.broken");
  assert.equal(app.requests.length, 0);
  assert.match(app.elements.get("calendar").innerHTML, /invalid or incomplete/);
  assert.deepEqual(JSON.parse(app.storage.get("fomo-nomo-settings-v1")), saved);
});

test("rapid edits and undo leave the latest sources in the shared URL", async () => {
  const sources = [{ id: "one", name: "One", url: "https://luma.com/one", color: "#6688c5", enabled: true }];
  const app = await loadApp({ sources });
  app.run("removeSource(0)");
  app.elements.get("undo-remove").onclick();
  await app.elements.get("share-calendar").onclick();
  const recipient = await loadApp({ sources: [] }, [], new URL(app.elements.get("share-link").value).hash);
  assert.equal(recipient.requests[0].sources[0].name, "One");
});

test("source moves preserve data, persist order, and share the reordered list", async () => {
  const sources = ["First", "Second", "Third"].map((name, index) => ({
    id: String(index), name, url: "https://luma.com/" + index, color: "#6688c5", enabled: index !== 1
  }));
  const app = await loadApp({ sources });
  app.run("moveSource(0,-1);moveSource(2,1);moveSource(1,-1);moveSource(1,1)");
  const expected = [sources[1], sources[2], sources[0]];
  assert.deepEqual(JSON.parse(app.storage.get("fomo-nomo-settings-v1")).sources, expected);
  assert.equal(app.requests.length, 1);
  await app.elements.get("share-calendar").onclick();
  const recipient = await loadApp({ sources: [] }, [], new URL(app.elements.get("share-link").value).hash);
  assert.deepEqual(recipient.requests[0].sources.map(source => source.name), expected.map(source => source.name));
});

test("drag handle commits the drop position and cancellation preserves source order", async () => {
  const sources = ["First", "Second", "Third"].map((name, index) => ({
    id: String(index), name, url: "https://luma.com/" + index, color: "#6688c5"
  }));
  const app = await loadApp({ sources });
  const handle = {
    focus() {}, setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {}
  };
  const rows = sources.map((_, index) => ({
    style: {}, classList: { add() {}, remove() {} },
    getBoundingClientRect: () => ({ top: 100 + index * 50, height: 40 }),
    querySelector: () => handle
  }));
  app.elements.get("sources").children = rows;
  app.elements.set("test-handle", handle);
  app.elements.set("test-row", rows[0]);
  app.run('bindSourceDrag($("test-handle"),$("test-row"),0)');
  const pointer = { pointerId: 1, button: 0, isPrimary: true, clientY: 120, preventDefault() {} };
  handle.onpointerdown(pointer);
  handle.onpointermove({ ...pointer, clientY: 240 });
  handle.onpointercancel(pointer);
  assert.deepEqual(JSON.parse(app.storage.get("fomo-nomo-settings-v1")).sources, sources);
  handle.onpointerdown(pointer);
  handle.onpointermove({ ...pointer, clientY: 240 });
  handle.onpointerup(pointer);
  assert.deepEqual(JSON.parse(app.storage.get("fomo-nomo-settings-v1")).sources, [sources[1], sources[2], sources[0]]);
  assert.equal(rows[0].style.transform, "");
});
