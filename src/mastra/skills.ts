import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const skillsRoot = join(here, '..', '..', 'skills');

export const ASO_AUDIT_RUBRIC_SKILL_PATH = join(skillsRoot, 'aso-audit-rubric', 'SKILL.md');

let cachedRubric: string | null = null;

export function loadAsoAuditRubric(): string {
  if (cachedRubric !== null) return cachedRubric;
  const raw = readFileSync(ASO_AUDIT_RUBRIC_SKILL_PATH, 'utf8');
  cachedRubric = stripFrontmatter(raw);
  return cachedRubric;
}

function stripFrontmatter(md: string): string {
  if (!md.startsWith('---')) return md;
  const end = md.indexOf('\n---', 3);
  if (end === -1) return md;
  return md.slice(end + 4).replace(/^\s+/, '');
}
