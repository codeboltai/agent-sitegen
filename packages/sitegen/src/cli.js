import path from 'path';
import { parseArgs } from './args.js';
import { resolveOptions } from './config.js';
import { loadContent } from './content.js';
import { generateSite } from './generate.js';
import { createTemplate, initProject } from './scaffold.js';
import { discoverTemplates, generateTemplatePrompt, loadTemplate, summarizeTemplate } from './template.js';
import { validateContent } from './validate.js';

export async function runCli(argv, cwd = process.cwd()) {
  const [command = 'help', subcommand, ...rest] = argv;
  const commandArgs = subcommand ? [subcommand, ...rest] : [];

  if (command === 'generate') return commandGenerate(commandArgs, cwd);
  if (command === 'validate') return commandValidate(commandArgs, cwd);
  if (command === 'init') return commandInit(commandArgs, cwd);
  if (command === 'create-template') return commandCreateTemplate(commandArgs, cwd);
  if (command === 'templates') return commandTemplates(subcommand, rest, cwd);
  if (command === 'help' || command === '--help' || command === '-h') return printHelp();

  throw new Error(`Unknown command: ${command}\nRun: agent-sitegen help`);
}

function commandGenerate(argv, cwd) {
  const { flags } = parseArgs(argv);
  const options = resolveOptions(cwd, flags);
  const result = generateSite(options, cwd);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Generated ${result.pages} page(s) at ${path.relative(cwd, result.outputDir) || '.'}`);
}

function commandValidate(argv, cwd) {
  const { flags } = parseArgs(argv);
  const options = resolveOptions(cwd, flags);
  const content = loadContent(options.content);
  const template = loadTemplate(options.template, cwd);
  const errors = validateContent(content, template);

  if (options.json) {
    console.log(JSON.stringify({ ok: errors.length === 0, errors }, null, 2));
    return;
  }

  if (!errors.length) {
    console.log('Content is valid.');
    return;
  }

  for (const item of errors) {
    console.error(`${item.path}: ${item.message}`);
    if (item.hint) console.error(`  Hint: ${item.hint}`);
  }
  process.exitCode = 1;
}

function commandTemplates(subcommand = 'list', argv, cwd) {
  const { positional, flags } = parseArgs(argv);

  if (subcommand === 'list') {
    const templates = discoverTemplates(cwd);
    if (flags.json) {
      console.log(JSON.stringify(templates, null, 2));
      return;
    }
    for (const template of templates) {
      console.log(`${template.name}${template.description ? ` - ${template.description}` : ''}`);
    }
    return;
  }

  if (subcommand === 'inspect') {
    const templateRef = positional[0] || flags.template || './template';
    const template = loadTemplate(templateRef, cwd);
    const summary = {
      ...summarizeTemplate(template),
      generated: template.generated,
      componentGroups: template.componentGroups,
      components: template.components,
    };

    if (flags.json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    console.log(`${summary.name}${summary.description ? ` - ${summary.description}` : ''}`);
    console.log(`Components: ${Object.keys(summary.components).length}`);
    for (const component of Object.values(summary.components)) {
      console.log(`- ${component.type}: ${component.component}${component.description ? ` - ${component.description}` : ''}`);
    }
    return;
  }

  if (subcommand === 'prompt') {
    const templateRef = positional[0] || flags.template || './template';
    console.log(generateTemplatePrompt(loadTemplate(templateRef, cwd)));
    return;
  }

  throw new Error(`Unknown templates command: ${subcommand}`);
}

function commandInit(argv, cwd) {
  const { positional, flags } = parseArgs(argv);
  const dir = path.resolve(cwd, positional[0] || '.');
  const result = initProject(dir, flags);
  console.log(`Initialized project at ${path.relative(cwd, result.dir) || '.'}`);
}

function commandCreateTemplate(argv, cwd) {
  const { positional } = parseArgs(argv);
  const dir = path.resolve(cwd, positional[0] || 'my-sitegen-template');
  createTemplate(dir);
  console.log(`Created template at ${path.relative(cwd, dir) || '.'}`);
}

function printHelp() {
  console.log(`agent-sitegen

Commands:
  generate                 Generate a site from content and a template
  validate                 Validate content against a template
  init [dir]               Create a content project
  create-template [dir]    Scaffold a reusable template
  templates list           List available templates
  templates inspect [ref]  Inspect a template
  templates prompt [ref]   Print an LLM-friendly template prompt

Common flags:
  --template <ref>         Template name, package, or local path
  --content <file>         YAML or JSON content file
  --output <dir>           Generated site output directory
  --config <file>          Optional project config file
  --json                   Print machine-readable output

Defaults:
  template: ./template
  content:  ./content/site.yaml
  output:   ./site
`);
}
