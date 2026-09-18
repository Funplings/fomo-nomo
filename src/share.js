// Self-contained so the same codec can run in the browser and in Node tests.
export function createShareCodec() {
  const maxBytes = 100_000;
  const hosts = new Set(["book.squareup.com", "luma.com", "partiful.com", "www.partiful.com", "eventbrite.com", "www.eventbrite.com"]);

  function unpack(rows) {
    if (!Array.isArray(rows) || rows.length > 20) throw new Error("Invalid shared sources.");
    return rows.map((row, index) => {
      if (!Array.isArray(row) || row.length < 3 || row.length > 5) throw new Error("Invalid shared source.");
      const [name, url, color, disabled = 0, categories = []] = row;
      if (typeof name !== "string" || name.length > 100 || typeof url !== "string" || url.length > 4096 ||
          typeof color !== "string" || !/^[0-9a-f]{6}$/i.test(color) || ![0, 1].includes(disabled) ||
          !Array.isArray(categories) || categories.length > 10 || categories.some(c => typeof c !== "string" || c.length > 100)) {
        throw new Error("Invalid shared source.");
      }
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || !hosts.has(parsed.hostname) || parsed.username || parsed.password) {
        throw new Error("Unsupported source URL in shared calendar.");
      }
      return { id: "shared-" + index, name, url, color: "#" + color.toLowerCase(), enabled: !disabled, categories };
    });
  }

  async function encodeSources(sources) {
    const rows = sources.map(source => {
      const row = [source.name, source.url, String(source.color).replace(/^#/, "").toLowerCase()];
      if (source.categories?.length) row.push(source.enabled === false ? 1 : 0, source.categories);
      else if (source.enabled === false) row.push(1);
      return row;
    });
    unpack(rows);
    const bytes = new TextEncoder().encode(JSON.stringify(rows));
    if (bytes.length > maxBytes) throw new Error("This calendar is too large to share.");
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    const base64 = btoa(Array.from(compressed, byte => String.fromCharCode(byte)).join(""));
    return "v1." + base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  }

  async function decodeSources(value) {
    if (value.length > 140_000 || !/^v1\.[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid calendar link.");
    const base64 = value.slice(3).replaceAll("-", "+").replaceAll("_", "/");
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate")).getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        size += chunk.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          throw new Error("This calendar link is too large.");
        }
        chunks.push(chunk);
      }
    } finally {
      reader.releaseLock();
    }
    return unpack(JSON.parse(await new Blob(chunks).text()));
  }

  return { encodeSources, decodeSources };
}
