#!/usr/bin/env node
// Pilot: @ruvector/emergent-time via @metaharness/kernel dep chain → agentic_time_latest.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { readFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import init, {
  AgenticClock,
  StateDelta,
  AgentHealthJs,
  TickClassJs,
} from "@ruvector/emergent-time";

const HARNESS_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = join(HARNESS_ROOT, "..", "..");

async function loadInbox() {
  try {
    const raw = await readFile(
      join(REPO_ROOT, ".goalie/evidence/inbox_zero_latest.json"),
      "utf8",
    );
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function main() {
  const wasmPath = join(
    HARNESS_ROOT,
    "node_modules/@ruvector/emergent-time/pkg/emergent_time_wasm_bg.wasm",
  );
  const wasm = readFileSync(wasmPath);
  await init({ module_or_path: wasm });

  const inbox = await loadInbox();
  const pace = inbox.pace_cod_weight ?? 1.0;
  const antiCvt = inbox.anti_cvt_score ?? 0;
  const openItems = inbox.absolute_open_items ?? 0;

  const belief = Math.min(1, openItems / 50);
  const memory = Math.min(1, antiCvt / 100);
  const retrieval = pace >= 1.5 ? 0.3 : pace >= 1.0 ? 0.15 : 0.05;
  const goal = pace >= 1.0 ? 0.4 : 0.1;
  const contradiction = Math.min(1, antiCvt / 50);
  const plan = (inbox.completion_ratio_percent ?? 50) / 100;
  const progress = plan * 0.5;

  const clock = new AgenticClock();
  const tick = clock.tick(
    new StateDelta(belief, memory, retrieval, goal, contradiction, plan, contradiction, progress),
  );

  const out = {
    timestamp: new Date().toISOString(),
    schema: "agentic_time.v1",
    relate_only: true,
    synthetic_proxy: true,
    source: "@ruvector/emergent-time via apps/agent-harness",
    inputs: {
      pace_cod_weight: pace,
      anti_cvt_score: antiCvt,
      absolute_open_items: openItems,
    },
    tick: {
      delta_time: tick.deltaTime,
      class: TickClassJs[tick.class],
      reason: tick.reason,
    },
    clock: {
      cumulative_time: clock.cumulativeTime,
      cumulative_progress: clock.cumulativeProgress,
      ati: clock.ati,
      health: AgentHealthJs[clock.health],
    },
  };

  const evidenceDir = join(REPO_ROOT, ".goalie/evidence");
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(
    join(evidenceDir, "agentic_time_latest.json"),
    JSON.stringify(out, null, 2) + "\n",
  );
  console.log(`agentic_time_latest.json health=${out.clock.health} ati=${out.clock.ati}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
