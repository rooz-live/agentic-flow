import fs from 'node:fs';
import YAML from 'yaml';
export function computeWsjfScore(inputs) {
    const jobSize = inputs.jobSize;
    if (!Number.isFinite(jobSize) || jobSize <= 0) {
        throw new Error(`jobSize must be > 0 (got ${jobSize})`);
    }
    const cod = (Number(inputs.userBusinessValue) || 0) +
        (Number(inputs.timeCriticality) || 0) +
        (Number(inputs.riskReduction) || 0);
    return cod / jobSize;
}
function asString(v) {
    return typeof v === 'string' && v.trim() ? v : undefined;
}
function asNumber(v) {
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v)))
        return Number(v);
    return undefined;
}
function extractWsdfScore(raw) {
    return (asNumber(raw?.wsjf_score) ??
        asNumber(raw?.wsjf) ??
        asNumber(raw?.economic?.wsjf_score) ??
        asNumber(raw?.economic?.wsjf));
}
function extractKanbanItems(kanban) {
    const out = [];
    const pushItem = (raw) => {
        const id = asString(raw?.id) ?? asString(raw?.risk_id);
        const title = asString(raw?.title) ?? asString(raw?.name);
        if (!id || !title)
            return;
        out.push({
            id,
            title,
            status: asString(raw?.status) ?? asString(raw?.state),
            wsjfScore: extractWsdfScore(raw),
            source: 'kanban',
        });
    };
    if (Array.isArray(kanban?.items)) {
        for (const raw of kanban.items)
            pushItem(raw);
        return out;
    }
    const columns = kanban?.columns;
    if (columns && typeof columns === 'object') {
        for (const col of Object.values(columns)) {
            const items = col?.items;
            if (Array.isArray(items)) {
                for (const raw of items)
                    pushItem(raw);
            }
            const cards = col?.cards;
            if (Array.isArray(cards)) {
                for (const raw of cards)
                    pushItem(raw);
            }
        }
    }
    return out;
}
function extractRoamItems(roam) {
    const out = [];
    const items = roam?.items;
    if (!Array.isArray(items))
        return out;
    for (const raw of items) {
        const id = asString(raw?.id) ?? asString(raw?.risk_id);
        const title = asString(raw?.title) ?? asString(raw?.name);
        if (!id || !title)
            continue;
        out.push({
            id,
            title,
            status: asString(raw?.status) ?? asString(raw?.state),
            wsjfScore: extractWsdfScore(raw),
            source: 'roam',
        });
    }
    return out;
}
export function loadYamlFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return YAML.parse(content);
}
export function buildSsotSnapshotFromObjects(input) {
    const items = [];
    if (input.kanban)
        items.push(...extractKanbanItems(input.kanban));
    if (input.roam)
        items.push(...extractRoamItems(input.roam));
    const dedup = new Map();
    for (const item of items) {
        if (!dedup.has(item.id))
            dedup.set(item.id, item);
    }
    return {
        generatedAt: new Date().toISOString(),
        items: Array.from(dedup.values()).sort((a, b) => (b.wsjfScore ?? 0) - (a.wsjfScore ?? 0)),
    };
}
export function buildSsotSnapshotFromFiles(input) {
    const kanban = input.kanbanPath ? loadYamlFile(input.kanbanPath) : undefined;
    const roam = input.roamPath ? loadYamlFile(input.roamPath) : undefined;
    return buildSsotSnapshotFromObjects({ kanban, roam });
}
//# sourceMappingURL=ssot.js.map