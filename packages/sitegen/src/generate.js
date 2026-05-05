import { loadContent } from './content.js';
import { loadTemplate } from './template.js';
import { validateContent } from './validate.js';
import { generateAstroSite } from './renderers/astro.js';

export function generateSite(options, cwd = process.cwd()) {
  const content = loadContent(options.content);
  const template = loadTemplate(options.template, cwd);
  const errors = validateContent(content, template);

  if (errors.length) {
    const message = errors.map((item) => `${item.path}: ${item.message}${item.hint ? `\n  Hint: ${item.hint}` : ''}`).join('\n');
    const error = new Error(`Content validation failed:\n${message}`);
    error.errors = errors;
    throw error;
  }

  return generateAstroSite(content, template, options.output);
}

