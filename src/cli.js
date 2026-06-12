import { ingest, sendDigest } from "./app.js";

const command = process.argv[2];
if (command === "ingest") {
  const result = await ingest();
  console.log(`Imported ${result.imported} events; ${result.events.length} stored.`);
  if (result.failures.length) console.error(`Failures:\n- ${result.failures.join("\n- ")}`);
} else if (command === "send") {
  const result = await sendDigest();
  console.log(`Sent digest: ${result.id}`);
} else {
  console.error("Usage: node src/cli.js <ingest|send>");
  process.exitCode = 1;
}
