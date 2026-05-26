#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const [inputFile = "results.sarif", outputFile = inputFile] = process.argv.slice(2);
const sarif = JSON.parse(readFileSync(inputFile, "utf8"));

for (const run of sarif.runs ?? []) {
  if (!Array.isArray(run.results)) {
    continue;
  }

  run.results = run.results.filter((result) => result.ruleId !== "SASTID");
}

writeFileSync(outputFile, `${JSON.stringify(sarif)}\n`);
