import fs from 'fs';
import yaml from 'js-yaml';

export function loadContent(contentPath) {
  if (!fs.existsSync(contentPath)) {
    throw new Error(`Content file not found: ${contentPath}`);
  }

  const raw = fs.readFileSync(contentPath, 'utf8');
  if (contentPath.endsWith('.json')) return JSON.parse(raw);
  return yaml.load(raw);
}

