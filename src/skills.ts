import * as fs from 'fs';
import * as path from 'path';

export interface Skill {
  name: string;
  description: string;
  triggers: string[];
  prompt: string;
  tools?: string[];
}

const SKILLS_DIR = '.ocoder/skills';

export function loadSkills(): Skill[] {
  const skills: Skill[] = [];
  const skillsPath = path.join(process.cwd(), SKILLS_DIR);
  const homeSkillsPath = path.join(process.env.HOME || '', '.ocoder-code', 'skills');

  const dirs = [skillsPath, homeSkillsPath];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.json'));
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        const skill = parseSkillFile(file, content);
        if (skill) {
          skills.push(skill);
        }
      } catch (e) {
      }
    }
  }

  return skills;
}

function parseSkillFile(filename: string, content: string): Skill | null {
  if (filename.endsWith('.json')) {
    try {
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  }

  const name = filename.replace('.md', '');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let prompt = content;

  if (frontmatterMatch) {
    prompt = content.slice(frontmatterMatch[0].length).trim();
  }

  const triggers: string[] = [];
  const triggerMatch = prompt.match(/triggers?:\s*([^\n]+)/i);
  if (triggerMatch) {
    triggers.push(...triggerMatch[1].split(',').map(t => t.trim()));
  }

  return {
    name,
    description: `Skill: ${name}`,
    triggers,
    prompt: prompt.slice(0, 500),
  };
}

export function findRelevantSkills(context: string): Skill[] {
  const skills = loadSkills();
  return skills.filter(skill => {
    return skill.triggers.some(trigger => context.toLowerCase().includes(trigger.toLowerCase()));
  });
}

export function injectSkillsIntoPrompt(basePrompt: string, context: string): string {
  const relevantSkills = findRelevantSkills(context);

  if (relevantSkills.length === 0) {
    return basePrompt;
  }

  const skillsSection = '\n\n## Relevant Skills\n' +
    relevantSkills.map(s => `- ${s.name}: ${s.prompt}`).join('\n');

  return basePrompt + skillsSection;
}

export function getSkillsDir(): string {
  return SKILLS_DIR;
}

export function initSkillsDir(): void {
  const skillsDir = path.join(process.cwd(), SKILLS_DIR);
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }

  const exampleSkill = `---
name: security-review
triggers: security, vulnerability, audit
---

You are a security expert. When reviewing code, check for:
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication issues
- Authorization issues
- Sensitive data exposure
`;

  const skillFile = path.join(skillsDir, 'security-review.md');
  if (!fs.existsSync(skillFile)) {
    fs.writeFileSync(skillFile, exampleSkill, 'utf-8');
  }
}
