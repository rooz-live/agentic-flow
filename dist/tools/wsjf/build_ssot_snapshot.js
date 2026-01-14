import fs from 'node:fs';
import path from 'node:path';
import { buildSsotSnapshotFromFiles } from '../../src/core/wsjf/ssot';
function argValue(flag) {
    const idx = process.argv.indexOf(flag);
    if (idx === -1)
        return undefined;
    const v = process.argv[idx + 1];
    return v && !v.startsWith('--') ? v : undefined;
}
const cwd = process.cwd();
const kanbanPath = argValue('--kanban') ?? path.join(cwd, '.goalie', 'KANBAN_BOARD.yaml');
const roamPath = argValue('--roam') ?? path.join(cwd, '.goalie', 'ROAM_TRACKER.yaml');
const outPath = argValue('--out') ?? path.join(cwd, '.goalie', 'wsjf_ssot_snapshot.json');
const effectiveKanban = fs.existsSync(kanbanPath) ? kanbanPath : undefined;
const effectiveRoam = fs.existsSync(roamPath) ? roamPath : undefined;
const snapshot = buildSsotSnapshotFromFiles({
    kanbanPath: effectiveKanban,
    roamPath: effectiveRoam,
});
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
process.stdout.write(outPath + '\n');
//# sourceMappingURL=build_ssot_snapshot.js.map