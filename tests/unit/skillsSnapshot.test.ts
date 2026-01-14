import { buildSkillRankingFromMarkdown } from '../../src/core/skills/skillsSnapshot';

describe('skillsSnapshot', () => {
  test('parses frontmatter and produces ranking fields', () => {
    const md = `---
name: "Alternative Generator"
description: "Forces 3+ options. Use when recommending architecture."
triggers:
  - "When proposing architecture"
wsjf:
  userBusinessValue: 10
  timeCriticality: 8
  riskReduction: 6
  jobSize: 2
---

# Alternative Generator

OPTION 1: In-memory
OPTION 2: Redis
OPTION 3: SQLite

## Verification Checklist
- do the thing
`;

    const ranked = buildSkillRankingFromMarkdown('alternative-generator', '/tmp/SKILL.md', md, 1);
    expect(ranked).toBeDefined();

    expect(ranked?.name).toBe('Alternative Generator');
    expect(ranked?.triggers).toEqual(['When proposing architecture']);
    expect(ranked?.wsjf.userBusinessValue).toBe(10);

    expect(ranked?.optionalityScore).toBeGreaterThan(0);
    expect(ranked?.evidenceOrientationScore).toBeGreaterThan(0);
    expect(ranked?.rankScore).toBeGreaterThan(0);
    expect(ranked?.scriptCount).toBe(1);
  });
});
