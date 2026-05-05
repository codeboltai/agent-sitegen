import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { readJsonIfExists } from './fs-utils.js';

const CONFIG_FILES = ['sitegen.config.json', 'sitegen.config.yaml', 'sitegen.config.yml'];

export function loadProjectConfig(cwd, explicitPath) {
  const configPath = explicitPath
    ? path.resolve(cwd, explicitPath)
    : CONFIG_FILES.map((name) => path.join(cwd, name)).find((candidate) => fs.existsSync(candidate));

  if (!configPath) return {};
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  if (configPath.endsWith('.json')) {
    return readJsonIfExists(configPath) || {};
  }

  return yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
}

export function resolveOptions(cwd, flags = {}) {
  const projectConfig = loadProjectConfig(cwd, flags.config);

  return {
    template: flags.template || projectConfig.template || defaultTemplate(cwd),
    content: path.resolve(cwd, flags.content || projectConfig.content || './content/site.yaml'),
    output: path.resolve(cwd, flags.output || projectConfig.output || './site'),
    cleanPages: flags.cleanPages ?? projectConfig.cleanPages ?? true,
    json: Boolean(flags.json),
  };
}

function defaultTemplate(cwd) {
  const localTemplate = path.join(cwd, 'template');
  if (fs.existsSync(localTemplate)) return './template';
  return './template';
}
