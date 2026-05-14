#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, ".probe-output");
mkdirSync(OUT_DIR, { recursive: true });

const SCENARIOS = ["flat", "gaps", "ladders", "overhang", "maze"];
const BASE = process.env.SANDBOX_URL ?? "http://localhost:3000";
const TIMEOUT_MS = 20000;

async function probeScenario(page, name) {
  await page.goto(`${BASE}/#/sandbox/${name}`);
  await page.evaluate(() => {
    const existing = JSON.parse(localStorage.getItem("Settings") || "{}");
    localStorage.setItem(
      "Settings",
      JSON.stringify({ ...existing, tutorialDone: true }),
    );
  });
  await page.goto(`${BASE}/#/sandbox/${name}`);
  await page.waitForSelector(".hud", { timeout: 15000 });
  // Wait until window.debug.scenario() reports the right scenario — confirms
  // the route+server handshake is fully done.
  await page.waitForFunction(
    (expected) => window.debug?.scenario?.()?.name === expected,
    name,
    { timeout: 10000 },
  );
  return page.evaluate(async (t) => {
    return await window.debug.runAll({ timeoutMsPerTarget: t });
  }, TIMEOUT_MS);
}

function fmtTable(allResults) {
  const lines = [
    "| scenario | label | reason | dist | edges | ms |",
    "|----------|-------|--------|------|-------|------|",
  ];
  for (const { scenario, results } of allResults) {
    for (const r of results) {
      lines.push(
        `| ${scenario} | ${r.label} | ${r.reason} | ${r.distanceToTarget.toFixed(0)} | ${r.edgesConsumed}/${r.edgeCount} | ${r.durationMs.toFixed(0)} |`,
      );
    }
  }
  return lines.join("\n");
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const all = [];
  for (const s of SCENARIOS) {
    process.stdout.write(`Probing ${s}... `);
    try {
      const result = await probeScenario(page, s);
      all.push(result);
      console.log(JSON.stringify(result.summary));
    } catch (err) {
      console.log(`failed: ${err.message}`);
      all.push({
        scenario: s,
        results: [],
        summary: {
          total: 0, arrived: 0, stuck: 0, dead: 0,
          damaged: 0, timeout: 0, noPath: 0,
        },
      });
    }
  }
  await browser.close();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = join(OUT_DIR, `${stamp}.md`);
  const body = [
    `# Path-follow probe ${stamp}`,
    "",
    "## Summary",
    "",
    "| scenario | arrived | stuck | dead | damaged | timeout | no-path |",
    "|----------|---------|-------|------|---------|---------|---------|",
    ...all.map(
      ({ scenario, summary }) =>
        `| ${scenario} | ${summary.arrived} | ${summary.stuck} | ${summary.dead} | ${summary.damaged} | ${summary.timeout} | ${summary.noPath} |`,
    ),
    "",
    "## Detail",
    "",
    fmtTable(all),
  ].join("\n");
  writeFileSync(path, body);
  console.log(`\nReport: ${path}`);
})();
