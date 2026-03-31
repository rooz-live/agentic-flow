import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

import { computeWsjfScore, type WsjfInputs } from '../wsjf/ssot';

export interface SkillFrontmatter {
  name: string;
  description: string;
  triggers: string[];
  wsjf?: Partial<WsjfInputs>;
  optionality?: number;
  implementability?: number;
  methodPatterns: string[];
}

export interface MethodPatternFactorSignals {
  method: number;
  pattern: number;
  protocol: number;
  factors: number;
  wsjf: number;
}

export interface SkillRankingItem {
  slug: string;
  name: string;
  description: string;
  filePath: string;
  triggers: string[];
  methodPatterns: string[];
  signals: MethodPatternFactorSignals;
  wsjf: WsjfInputs;
  wsjfScore: number;
  optionalityScore: number;
  implementabilityScore: number;
  evidenceOrientationScore: number;
  rankScore: number;
  bodyBytes: number;
  scriptCount: number;
}

export interface SkillsSnapshot {
  generatedAt: string;
  skills: SkillRankingItem[];
}

export interface ParsedSkillMarkdown {
  frontmatter: SkillFrontmatter;
  body: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function normalizeText(s: string): string {
  return s.toLowerCase();
}

function inferJobSizeFromBodyBytes(bodyBytes: number): number {
  if (bodyBytes <= 1500) return 2;
  if (bodyBytes <= 5000) return 3;
  if (bodyBytes <= 12000) return 5;
  if (bodyBytes <= 30000) return 8;
  return 13;
}

function inferWsjfInputsFromText(text: string, bodyBytes: number): WsjfInputs {
  const t = normalizeText(text);

  const hasAny = (keywords: string[]) => keywords.some(k => t.includes(k));

  const userBusinessValue = hasAny([
    'ci/cd',
    'cicd',
    'pipeline',
    'deployment',
    'go-live',
    'revenue',
    'subscription',
    'production',
  ])
    ? 8
    : 5;

  const timeCriticality = hasAny(['incident', 'outage', 'fail-fast', 'rollback', 'hotfix', 'prod'])
    ? 7
    : 4;

  const riskReduction = hasAny(['security', 'compliance', 'audit', 'risk', 'vulnerability', 'rbac'])
    ? 8
    : 3;

  const jobSize = inferJobSizeFromBodyBytes(bodyBytes);

  return {
    userBusinessValue,
    timeCriticality,
    riskReduction,
    jobSize,
  };
}

function inferOptionalityScore(text: string): number {
  const optionCount = (text.match(/\bOPTION\s+\d+\b/gi) ?? []).length;
  const alternativesCount = (text.match(/\balternative(s)?\b/gi) ?? []).length;

  const score = optionCount * 3 + Math.min(alternativesCount, 6);
  return clamp(score, 0, 10);
}

function inferEvidenceOrientationScore(text: string): number {
  const t = normalizeText(text);

  const hasAny = (keywords: string[]) => keywords.some(k => t.includes(k));

  const score =
    (hasAny(['verification checklist', 'validation checklist']) ? 4 : 0) +
    (hasAny(['troubleshooting']) ? 2 : 0) +
    (hasAny(['expected output']) ? 2 : 0) +
    (hasAny(['tests', 'unit test', 'integration test']) ? 2 : 0);

  return clamp(score, 0, 10);
}

function extractMethodPatterns(text: string): string[] {
  const patterns = new Set<string>();

  for (const m of text.match(/\bpattern:[a-z0-9_-]+\b/gi) ?? []) {
    patterns.add(m.toLowerCase());
  }

  return Array.from(patterns).sort();
}

function countRegexMatches(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

function extractSignals(text: string): MethodPatternFactorSignals {
  return {
    method: countRegexMatches(text, /\bmethod\b/gi),
    pattern: countRegexMatches(text, /\bpattern\b/gi),
    protocol: countRegexMatches(text, /\bprotocol\b/gi),
    factors: countRegexMatches(text, /\bfactor(s)?\b/gi),
    wsjf: countRegexMatches(text, /\bwsjf\b/gi),
  };
}

export function parseSkillMarkdown(markdown: string): ParsedSkillMarkdown | undefined {
  const match = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (!match) return undefined;

  const rawFrontmatter = match[1];
  const parsed = YAML.parse(rawFrontmatter) as any;

  const name = asString(parsed?.name);
  const description = asString(parsed?.description);
  if (!name || !description) return undefined;

  const triggers: string[] = Array.isArray(parsed?.triggers)
    ? parsed.triggers.map((t: unknown) => asString(t)).filter(Boolean)
    : [];

  const wsjf = parsed?.wsjf && typeof parsed.wsjf === 'object' ? parsed.wsjf : undefined;

  const wsjfInputs: Partial<WsjfInputs> | undefined = wsjf
    ? {
        userBusinessValue: asNumber(wsjf.userBusinessValue),
        timeCriticality: asNumber(wsjf.timeCriticality),
        riskReduction: asNumber(wsjf.riskReduction),
        jobSize: asNumber(wsjf.jobSize),
      }
    : undefined;

  const optionality = asNumber(parsed?.optionality);
  const implementability = asNumber(parsed?.implementability);

  const methodPatterns: string[] = Array.isArray(parsed?.methodPatterns)
    ? parsed.methodPatterns.map((p: unknown) => asString(p)).filter(Boolean)
    : [];

  const body = markdown.slice(match[0].length);

  return {
    frontmatter: {
      name,
      description,
      triggers,
      wsjf: wsjfInputs,
      optionality: optionality === undefined ? undefined : clamp(optionality, 0, 10),
      implementability: implementability === undefined ? undefined : clamp(implementability, 0, 10),
      methodPatterns,
    },
    body,
  };
}

export function buildSkillRankingFromMarkdown(
  slug: string,
  filePath: string,
  markdown: string,
  scriptCount = 0,
): SkillRankingItem | undefined {
  const parsed = parseSkillMarkdown(markdown);
  if (!parsed) return undefined;

  const combinedText = `${parsed.frontmatter.description}\n\n${parsed.body}`;
  const bodyBytes = Buffer.byteLength(parsed.body, 'utf8');

  const signals = extractSignals(combinedText);

  const inferredWsjf = inferWsjfInputsFromText(combinedText, bodyBytes);

  const wsjf: WsjfInputs = {
    userBusinessValue: parsed.frontmatter.wsjf?.userBusinessValue ?? inferredWsjf.userBusinessValue,
    timeCriticality: parsed.frontmatter.wsjf?.timeCriticality ?? inferredWsjf.timeCriticality,
    riskReduction: parsed.frontmatter.wsjf?.riskReduction ?? inferredWsjf.riskReduction,
    jobSize: parsed.frontmatter.wsjf?.jobSize ?? inferredWsjf.jobSize,
  };

  const wsjfScore = computeWsjfScore(wsjf);
  const wsjfNorm = clamp(wsjfScore, 0, 20) / 20;

  const optionalityScore =
    parsed.frontmatter.optionality ?? inferOptionalityScore(combinedText);

  const implementabilityScore = parsed.frontmatter.implementability ?? clamp(12 - wsjf.jobSize, 1, 10);

  const evidenceOrientationScore = inferEvidenceOrientationScore(combinedText);

  const methodPatterns = Array.from(
    new Set([
      ...parsed.frontmatter.methodPatterns,
      ...extractMethodPatterns(combinedText),
    ]),
  ).sort();

  const triggers = parsed.frontmatter.triggers;

  const rankScore =
    wsjfNorm * 0.5 +
    (optionalityScore / 10) * 0.2 +
    (implementabilityScore / 10) * 0.2 +
    (evidenceOrientationScore / 10) * 0.1;

  return {
    slug,
    name: parsed.frontmatter.name,
    description: parsed.frontmatter.description,
    filePath,
    triggers,
    methodPatterns,
    signals,
    wsjf,
    wsjfScore,
    optionalityScore,
    implementabilityScore,
    evidenceOrientationScore,
    rankScore,
    bodyBytes,
    scriptCount,
  };
}

function countScriptsInSkillDir(skillDir: string): number {
  const scriptsDir = path.join(skillDir, 'scripts');
  if (!fs.existsSync(scriptsDir)) return 0;

  try {
    const entries = fs.readdirSync(scriptsDir, { withFileTypes: true });
    return entries.filter(e => e.isFile()).length;
  } catch {
    return 0;
  }
}

export function buildSkillsSnapshotFromDirectory(skillsDir: string): SkillsSnapshot {
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skills: SkillRankingItem[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const slug = entry.name;
    const skillDir = path.join(skillsDir, slug);
    const skillFilePath = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillFilePath)) continue;

    const markdown = fs.readFileSync(skillFilePath, 'utf8');
    const scriptCount = countScriptsInSkillDir(skillDir);

    const ranked = buildSkillRankingFromMarkdown(slug, skillFilePath, markdown, scriptCount);
    if (!ranked) continue;

    skills.push(ranked);
  }

  skills.sort((a, b) => b.rankScore - a.rankScore);

  return {
    generatedAt: new Date().toISOString(),
    skills,
  };
}
