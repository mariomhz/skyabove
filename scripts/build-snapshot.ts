/*
  Fetches the global OpenSky snapshot and writes the stats and compact aircraft
  positions the site serves. Runs on a schedule in GitHub Actions, because
  OpenSky blocks the AWS servers Vercel runs on.

  Usage: npx tsx scripts/build-snapshot.ts [output path]
*/
import { writeFile } from "node:fs/promises";
import { buildSnapshot } from "../lib/opensky";

async function main() {
  const out = process.argv[2] ?? "snapshot.json";
  const snapshot = await buildSnapshot();

  if (snapshot.positions.aircraft.length === 0) {
    throw new Error("OpenSky returned no aircraft; keeping the previous snapshot");
  }

  await writeFile(out, JSON.stringify(snapshot));
  console.log(
    `Wrote ${out}: ${snapshot.positions.aircraft.length} airborne aircraft at ${snapshot.stats.fetchedAt}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
