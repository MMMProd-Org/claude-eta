#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const [file = "results.sarif"] = process.argv.slice(2);
const sarif = JSON.parse(readFileSync(file, "utf8"));

for (const run of sarif.runs ?? []) {
  if (!Array.isArray(run.results)) {
    continue;
  }

  run.results = run.results.filter((result) => result.ruleId !== "SASTID");
}

writeFileSync(file, `${JSON.stringify(sarif)}\n`);
