import fs from 'fs';
import path from 'path';
import { copyDirSync, writeFileEnsured } from '../fs-utils.js';
import { ensureRelativeImport } from '../paths.js';
import { kebabToPascal } from '../names.js';

export function generateAstroSite(config, template, outputDir) {
  copyDirSync(template.templateDir, outputDir);

  const siteDataPath = path.join(outputDir, template.generated.siteData);
  writeFileEnsured(siteDataPath, generateSiteData(config));

  const pagesDir = path.join(outputDir, template.generated.pagesDir);
  fs.rmSync(pagesDir, { recursive: true, force: true });
  fs.mkdirSync(pagesDir, { recursive: true });

  const pages = config.pages || [];
  for (const page of pages) {
    const slug = page.slug === '' || page.slug === undefined ? 'index' : page.slug;
    const filePath = path.join(pagesDir, `${slug}.astro`);
    writeFileEnsured(filePath, generatePage(page, config, template, filePath, outputDir));
  }

  return {
    outputDir,
    pages: pages.length,
  };
}

function generateSiteData(config) {
  const siteObj = {
    name: config.site?.name,
    tagline: config.site?.tagline,
    logo: config.site?.logo,
  };

  return `// Auto-generated from site content. Do not edit directly.
export const site = ${JSON.stringify(siteObj, null, 2)};

export const navigation = ${JSON.stringify(config.navigation || {}, null, 2)};
`;
}

function generatePage(page, config, template, filePath, outputDir) {
  const sections = page.sections || [];
  const usedComponents = new Set(sections.map((section) => getComponentName(section.type, template)));
  const fileDir = path.dirname(filePath);

  const layoutPath = path.join(outputDir, template.generated.layout);
  const siteDataPath = path.join(outputDir, template.generated.siteData);
  const componentsDir = path.join(outputDir, template.generated.componentsDir);

  let frontmatter = `// Auto-generated from site content. Edit source content and regenerate.
import BaseLayout from '${ensureRelativeImport(fileDir, layoutPath)}';
import { site, navigation } from '${ensureRelativeImport(fileDir, siteDataPath)}';`;

  for (const component of usedComponents) {
    const componentPath = path.join(componentsDir, `${component}.astro`);
    frontmatter += `\nimport ${component} from '${ensureRelativeImport(fileDir, componentPath)}';`;
  }

  const navbarVariant = page.navbar_variant || page.navbarVariant || 'solid';
  const title = page.title || config.site?.name || '';
  let body = `<BaseLayout title="${escapeAttribute(title)}" navbarVariant="${escapeAttribute(navbarVariant)}" site={site} navigation={navigation}>`;

  for (const section of sections) {
    const component = getComponentName(section.type, template);
    const props = normalizeSectionProps(section);
    const propStrings = Object.entries(props)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => serializeProp(key, value))
      .join('\n    ');

    body += propStrings
      ? `\n  <${component}\n    ${propStrings}\n  />`
      : `\n  <${component} />`;
  }

  body += '\n</BaseLayout>';

  return `---\n${frontmatter}\n---\n${body}\n`;
}

function normalizeSectionProps(section) {
  if (section.props && typeof section.props === 'object') {
    return { ...section.props };
  }

  const props = { ...section };
  delete props.type;
  return props;
}

function getComponentName(sectionType, template) {
  return template.components[sectionType]?.component || kebabToPascal(sectionType);
}

function serializeProp(key, value) {
  if (typeof value === 'string') {
    if (value.includes('"') || value.includes('<') || value.includes('{') || value.includes('\n')) {
      return `${key}={\`${escapeTemplateLiteral(value)}\`}`;
    }
    return `${key}="${escapeAttribute(value)}"`;
  }
  if (typeof value === 'boolean') return `${key}={${value ? 'true' : 'false'}}`;
  if (typeof value === 'number') return `${key}={${value}}`;
  return `${key}={${JSON.stringify(value)}}`;
}

function escapeAttribute(value) {
  return String(value).replace(/"/g, '&quot;');
}

function escapeTemplateLiteral(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}
