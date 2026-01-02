#!/usr/bin/env python3

import argparse
import json
import os
import re
import subprocess
import time
import random
from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class RunResult:
    iterations: int
    returncode: int
    duration_s: float
    parsed: Dict[str, float]
    stdout_tail: str


_FLOW_RE = re.compile(r"Flow Metrics: Cycle time: ([0-9.]+)min, Throughput: ([0-9.]+)/hr, Efficiency: ([0-9]+)%")


def _run_one(project_root: str, iterations: int, circle: str, mode: str, no_early_stop: bool) -> RunResult:
    cmd = [
        os.path.join(project_root, 'scripts', 'af'),
        'prod-cycle',
        '--iterations',
        str(iterations),
        '--circle',
        circle,
        '--mode',
        mode,
    ]
    if no_early_stop:
        cmd.append('--no-early-stop')

    start = time.time()
    proc = subprocess.run(cmd, cwd=project_root, capture_output=True, text=True)
    end = time.time()

    stdout = proc.stdout or ''
    parsed: Dict[str, float] = {}

    m = _FLOW_RE.search(stdout)
    if m:
        parsed['cycle_time_min'] = float(m.group(1))
        parsed['throughput_per_hr'] = float(m.group(2))
        parsed['efficiency_pct'] = float(m.group(3))

    # Pull summary counts from the iteration review block
    succ = re.search(r"✅ Successful: (\d+)", stdout)
    fail = re.search(r"❌ Failed: (\d+)", stdout)
    if succ:
        parsed['successful'] = float(succ.group(1))
    if fail:
        parsed['failed'] = float(fail.group(1))

    tail = '\n'.join(stdout.splitlines()[-40:])
    return RunResult(
        iterations=iterations,
        returncode=proc.returncode,
        duration_s=round(end - start, 2),
        parsed=parsed,
        stdout_tail=tail,
    )


def _popen_one(project_root: str, iterations: int, circle: str, mode: str, no_early_stop: bool) -> subprocess.Popen:
    cmd = [
        os.path.join(project_root, 'scripts', 'af'),
        'prod-cycle',
        '--iterations',
        str(iterations),
        '--circle',
        circle,
        '--mode',
        mode,
    ]
    if no_early_stop:
        cmd.append('--no-early-stop')

    env = os.environ.copy()
    # Tag runs for log correlation
    env['AF_RUN_KIND'] = 'prod-cycle'
    return subprocess.Popen(cmd, cwd=project_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)


def main() -> None:
    parser = argparse.ArgumentParser(description='Run a swarm-style prod-cycle iteration experiment')
    parser.add_argument('--circle', default='testing')
    parser.add_argument('--mode', default='advisory', choices=['advisory', 'mutate', 'enforcement'])
    parser.add_argument('--iterations', default='5,25,50,100,250')
    parser.add_argument('--no-early-stop', action='store_true')
    parser.add_argument('--max-concurrency', type=int, default=int(os.environ.get('AF_SWARM_MAX_CONCURRENCY', '1')))
    parser.add_argument('--start-jitter-s', type=float, default=float(os.environ.get('AF_SWARM_START_JITTER_S', '0')))
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()

    project_root = os.environ.get('PROJECT_ROOT', os.getcwd())
    iters = [int(x.strip()) for x in args.iterations.split(',') if x.strip()]

    results: List[RunResult] = []
    if args.max_concurrency <= 1:
        for n in iters:
            results.append(_run_one(project_root, n, args.circle, args.mode, args.no_early_stop))
    else:
        pending = list(iters)
        running: List[Dict[str, object]] = []

        while pending or running:
            while pending and len(running) < args.max_concurrency:
                n = pending.pop(0)
                if args.start_jitter_s and args.start_jitter_s > 0:
                    time.sleep(random.uniform(0.0, args.start_jitter_s))
                start = time.time()
                proc = _popen_one(project_root, n, args.circle, args.mode, args.no_early_stop)
                running.append({'iterations': n, 'proc': proc, 'start': start})

            still_running: List[Dict[str, object]] = []
            for r in running:
                proc = r['proc']
                assert isinstance(proc, subprocess.Popen)
                if proc.poll() is None:
                    still_running.append(r)
                    continue

                end = time.time()
                out, err = proc.communicate()
                stdout = out or ''
                parsed: Dict[str, float] = {}
                m = _FLOW_RE.search(stdout)
                if m:
                    parsed['cycle_time_min'] = float(m.group(1))
                    parsed['throughput_per_hr'] = float(m.group(2))
                    parsed['efficiency_pct'] = float(m.group(3))
                succ = re.search(r"✅ Successful: (\d+)", stdout)
                fail = re.search(r"❌ Failed: (\d+)", stdout)
                if succ:
                    parsed['successful'] = float(succ.group(1))
                if fail:
                    parsed['failed'] = float(fail.group(1))

                tail = '\n'.join(stdout.splitlines()[-40:])
                results.append(RunResult(
                    iterations=int(r['iterations']),
                    returncode=int(proc.returncode or 0),
                    duration_s=round(end - float(r['start']), 2),
                    parsed=parsed,
                    stdout_tail=tail,
                ))

            running = still_running
            time.sleep(0.2)

    table = []
    for r in results:
        row = {
            'iterations': r.iterations,
            'returncode': r.returncode,
            'duration_s': r.duration_s,
            **r.parsed,
        }
        table.append(row)

    report = {
        'circle': args.circle,
        'mode': args.mode,
        'no_early_stop': args.no_early_stop,
        'max_concurrency': args.max_concurrency,
        'start_jitter_s': args.start_jitter_s,
        'runs': table,
    }

    if args.json:
        print(json.dumps(report, indent=2))
        return

    print('\nIterations\tDuration(s)\tCycleTime(min)\tThroughput(/hr)\tEfficiency(%)\tSuccess\tFail')
    for row in table:
        print(
            f"{row.get('iterations')}\t\t{row.get('duration_s', '')}\t\t{row.get('cycle_time_min', '')}\t\t{row.get('throughput_per_hr', '')}\t\t{row.get('efficiency_pct', '')}\t\t{int(row.get('successful', 0))}\t{int(row.get('failed', 0))}"
        )

    # Basic diminishing returns heuristic: max throughput per minute of wall time
    scored = []
    for row in table:
        dur = float(row.get('duration_s', 0) or 0)
        thr = float(row.get('throughput_per_hr', 0) or 0)
        if dur > 0:
            scored.append((row['iterations'], thr / (dur / 60.0)))
    if scored:
        best = sorted(scored, key=lambda x: x[1], reverse=True)[0]
        print(f"\nRecommended (heuristic): {best[0]} iterations")


if __name__ == '__main__':
    main()
