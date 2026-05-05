import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import yaml from 'js-yaml';
import { isPathLike, slash } from './paths.js';
import { listFilesRecursive, readJsonIfExists } from './fs-utils.js';
import { pascalToKebab } from './names.js';

const COMPONENT_EXTENSIONS = new Set(['.astro', '.jsx', '.tsx']);

export function loadTemplate(templateRef, cwd = process.cwd()) {
  const rootDir = resolveTemplateRoot(templateRef, cwd);
  const manifest = loadTemplateManifest(rootDir);
  const templateDir = path.resolve(rootDir, manifest.templateDir || '.');

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }

  const discoveredComponents = discoverComponents(templateDir);
  const manifestComponents = normalizeManifestComponents(manifest.components || {});
  const components = removePrivateComponents(
    mergeComponents(discoveredComponents, manifestComponents),
    manifest.privateComponents || manifest.excludeComponents || [],
  );

  return {
    ref: templateRef,
    rootDir,
    templateDir,
    manifest,
    name: manifest.name || path.basename(rootDir),
    description: manifest.description || '',
    generated: {
      pagesDir: manifest.generated?.pagesDir || 'src/pages',
      siteData: manifest.generated?.siteData || 'src/data/site-data.js',
      layout: manifest.generated?.layout || 'src/layouts/BaseLayout.astro',
      componentsDir: manifest.generated?.componentsDir || 'src/components',
    },
    components,
    componentGroups: manifest.componentGroups || [],
  };
}

export function discoverTemplates(cwd = process.cwd()) {
  const templates = new Map();

  for (const dir of [path.join(cwd, 'templates')]) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const template = safeLoadTemplate(path.join(dir, entry.name), cwd);
      if (template) templates.set(template.name, summarizeTemplate(template));
    }
  }

  for (const template of discoverNodeModuleTemplates(cwd)) {
    templates.set(template.name, summarizeTemplate(template));
  }

  return [...templates.values()];
}

export function summarizeTemplate(template) {
  return {
    name: template.name,
    description: template.description,
    rootDir: template.rootDir,
    componentCount: Object.keys(template.components).length,
  };
}

export function generateTemplatePrompt(template) {
  const lines = [
    `You are generating site content for the "${template.name}" template.`,
  ];

  if (template.description) lines.push('', template.description);

  lines.push('', 'Content shape:', '', 'site:', 'navigation:', 'pages:');
  lines.push('', 'Each page contains sections. Each section must include a type matching one of the supported components.');

  const grouped = groupComponents(template);
  for (const [groupName, components] of grouped) {
    lines.push('', `## ${groupName}`);
    for (const component of components) {
      const description = component.description ? ` - ${component.description}` : '';
      lines.push(`- ${component.type}: ${component.component}${description}`);
      const props = Object.entries(component.props || {});
      if (props.length) {
        lines.push(`  props: ${props.map(([name, spec]) => `${name}${spec.required ? '' : '?'}`).join(', ')}`);
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

function resolveTemplateRoot(templateRef, cwd) {
  if (isPathLike(templateRef)) {
    return path.resolve(cwd, templateRef);
  }

  const requireFromCwd = createRequire(path.join(cwd, 'package.json'));
  try {
    const manifestPath = requireFromCwd.resolve(`${templateRef}/sitegen.template.json`);
    return path.dirname(manifestPath);
  } catch {
    try {
      const packagePath = requireFromCwd.resolve(`${templateRef}/package.json`);
      return path.dirname(packagePath);
    } catch {
      throw new Error(`Unable to resolve template "${templateRef}". Use a local path or installed package.`);
    }
  }
}


function loadTemplateManifest(rootDir) {
  const jsonManifest = readJsonIfExists(path.join(rootDir, 'sitegen.template.json'));
  if (jsonManifest) return jsonManifest;

  for (const name of ['sitegen.template.yaml', 'sitegen.template.yml']) {
    const manifestPath = path.join(rootDir, name);
    if (fs.existsSync(manifestPath)) {
      return yaml.load(fs.readFileSync(manifestPath, 'utf8')) || {};
    }
  }

  return {
    name: path.basename(rootDir),
    templateDir: '.',
  };
}

function discoverComponents(templateDir) {
  const componentsDir = path.join(templateDir, 'src', 'components');
  const files = listFilesRecursive(componentsDir, (file) => COMPONENT_EXTENSIONS.has(path.extname(file)));
  const components = {};

  for (const file of files) {
    const component = path.basename(file, path.extname(file));
    const metadata = parseComponentMetadata(file);
    const type = metadata.type || pascalToKebab(component);

    components[type] = {
      type,
      component: metadata.name || component,
      description: metadata.description || '',
      group: metadata.group,
      props: metadata.props || {},
      file: slash(path.relative(templateDir, file)),
    };
  }

  return components;
}

function parseComponentMetadata(file) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/\/\*\*([\s\S]*?@sitegen[\s\S]*?)\*\//);
  if (!match) return {};

  const cleaned = match[1]
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .filter((line) => !line.trim().startsWith('@sitegen'))
    .join('\n');

  try {
    return yaml.load(cleaned) || {};
  } catch {
    return {};
  }
}

function normalizeManifestComponents(components) {
  const normalized = {};
  for (const [type, value] of Object.entries(components)) {
    normalized[type] = typeof value === 'string'
      ? { type, component: value }
      : { type, ...value };
  }
  return normalized;
}

function mergeComponents(discovered, overrides) {
  const merged = { ...discovered };
  for (const [type, override] of Object.entries(overrides)) {
    merged[type] = {
      ...(merged[type] || { type }),
      ...override,
      type,
    };
  }
  return merged;
}

function removePrivateComponents(components, privateComponents) {
  const filtered = { ...components };
  for (const type of privateComponents) {
    delete filtered[type];
  }
  return filtered;
}

function groupComponents(template) {
  const seen = new Set();
  const groups = [];

  for (const group of template.componentGroups || []) {
    const components = (group.components || [])
      .map((type) => template.components[type])
      .filter(Boolean);
    components.forEach((component) => seen.add(component.type));
    groups.push([group.name || 'Components', components]);
  }

  const byInlineGroup = new Map();
  for (const component of Object.values(template.components)) {
    if (seen.has(component.type)) continue;
    const groupName = component.group || 'Components';
    if (!byInlineGroup.has(groupName)) byInlineGroup.set(groupName, []);
    byInlineGroup.get(groupName).push(component);
  }

  return [...groups, ...byInlineGroup.entries()].filter(([, components]) => components.length);
}

function safeLoadTemplate(ref, cwd) {
  try {
    return loadTemplate(ref, cwd);
  } catch {
    return null;
  }
}

function discoverNodeModuleTemplates(cwd) {
  const nodeModules = path.join(cwd, 'node_modules');
  if (!fs.existsSync(nodeModules)) return [];

  const candidates = [];
  for (const entry of fs.readdirSync(nodeModules, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.includes('sitegen-template')) {
      candidates.push(path.join(nodeModules, entry.name));
    }
    if (entry.isDirectory() && entry.name.startsWith('@')) {
      const scopeDir = path.join(nodeModules, entry.name);
      for (const scoped of fs.readdirSync(scopeDir, { withFileTypes: true })) {
        if (scoped.isDirectory() && scoped.name.includes('sitegen-template')) {
          candidates.push(path.join(scopeDir, scoped.name));
        }
      }
    }
  }

  return candidates.map((candidate) => safeLoadTemplate(candidate, cwd)).filter(Boolean);
}
