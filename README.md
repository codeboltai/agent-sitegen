# Agentic Sitegen

Monorepo for a reusable content-to-site generator CLI and separately authored templates.

## Packages

```txt
packages/sitegen     # publishable CLI package
templates/basic      # basic example template package
examples/basic       # sample content
```

Templates keep generator metadata in `sitegen.template.json`. The template root is the folder containing that manifest: put `package.json`, `src/`, `astro.config.mjs`, and other copied files directly beside it. The CLI skips `sitegen.template.json` while copying, so the generated site receives the template's normal project files.

The CLI defaults to project-local paths and does not assume templates are bundled:

```txt
./template
./content/site.yaml
./site
```

Use flags when paths differ:

```bash
sitegen generate --template ./template --content ./content/site.yaml --output ./site
sitegen validate --template ./template --content ./content/site.yaml
sitegen templates inspect ./template --json
sitegen templates prompt ./template
```

Local monorepo smoke test:

```bash
npm install
npm run validate:example
npm run generate:example
```
