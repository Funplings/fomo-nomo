import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { createShareCodec } from "../src/share.js";

const { encodeSources, decodeSources } = createShareCodec();
const pack = value => "v1." + deflateSync(value).toString("base64url");

test("compressed calendar links preserve Unicode, colors, order, and disabled sources", async () => {
  const sources = [
    { id: "local-1", name: "Art & café 🎨", url: "https://luma.com/art?city=nyc", color: "#abcdef", enabled: true },
    { id: "local-2", name: "Classes", url: "https://book.squareup.com/classes/widget/location/unit/classes", color: "#123456", enabled: false, categories: ["art"] }
  ];
  const encoded = await encodeSources(sources);
  assert.match(encoded, /^v1\.[A-Za-z0-9_-]+$/);
  const decoded = await decodeSources(encoded);
  assert.deepEqual(decoded, sources.map((source, index) => ({ ...source, id: "shared-" + index, categories: source.categories || [] })));
  assert.deepEqual(await decodeSources(await encodeSources([])), []);
});

test("compression reduces a representative multi-source calendar", async () => {
  const sources = Array.from({ length: 10 }, (_, index) => ({
    id: "source-" + index, name: "Community events " + index,
    url: "https://luma.com/community-calendar-" + index, color: "#6688c5", enabled: true
  }));
  const encoded = await encodeSources(sources);
  assert.ok(encoded.length < JSON.stringify(sources).length / 2);
});

test("rejects corrupt, unsupported, invalid, and oversized calendar links", async () => {
  for (const invalid of ["v2.abc", "v1.not-compressed", "v1.<script>", pack('{}'),
    pack(JSON.stringify([["Bad", "https://example.com/source", "6688c5"]])),
    pack(JSON.stringify([["Bad", "https://luma.com/source", "invalid"]])),
    pack(JSON.stringify(Array(21).fill(["Source", "https://luma.com/source", "6688c5"]))),
    pack(' '.repeat(100_001))]) {
    await assert.rejects(decodeSources(invalid));
  }
});
