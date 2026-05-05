# @codebolt/agent-sitegen

Generate static sites from structured content and reusable templates.

`agent-sitegen` is a small CLI that copies a template project, reads a YAML or JSON content file, and generates route files from that content. The template owns the framework, design system, components, dependencies, and deployment setup. The content file owns pages, navigation, and section props.

The first renderer targets Astro-style templates, but the CLI is intentionally template-first: templates are regular folders on disk and are not bundled into the CLI.

## Install

```bash
npm install -D @codebolt/agent-sitegen
```

Run with either binary:

```bash
npx sitegen --help
npx agent-sitegen --help
```

For global usage:

```bash
npm install -g @codebolt/agent-sitegen
sitegen --help
```

## Quick Start

Create a project with this shape:

```txt
my-site/
  template/
    package.json
    sitegen.template.json
    astro.config.mjs
    src/
      components/
      layouts/
      styles/
  content/
    site.yaml
```

Generate the site:

```bash
cd my-site
sitegen generate
```

By default, the CLI uses:

```txt
template: ./template
content:  ./content/site.yaml
output:   ./site
```

Then run the generated project:

```bash
cd site
npm install
npm run dev
```

## CLI Commands

### Generate

```bash
sitegen generate
```

With explicit paths:

```bash
sitegen generate \
  --template ./template \
  --content ./content/site.yaml \
  --output ./site
```

The command:

- copies the template folder into the output folder
- skips generator metadata like `sitegen.template.json`
- writes generated site data
- replaces generated pages under the configured pages directory

### Validate

```bash
sitegen validate --template ./template --content ./content/site.yaml
```

Machine-readable output:

```bash
sitegen validate --template ./template --content ./content/site.yaml --json
```

Example JSON error:

```json
{
  "ok": false,
  "errors": [
    {
      "source": "content",
      "path": "pages[0].sections[1].type",
      "code": "unknown-section",
      "message": "Unknown section type: feature-list",
      "hint": "Use one of: hero, card-grid, cta-block"
    }
  ]
}
```

### Inspect Templates

```bash
sitegen templates inspect ./template
```

JSON output:

```bash
sitegen templates inspect ./template --json
```

This reports the template name, generated paths, component groups, discovered components, and any prop metadata found in component comments.

### Generate An LLM Prompt

```bash
sitegen templates prompt ./template
```

This prints a compact prompt describing the template and available section types. It is useful when an LLM needs to write valid `site.yaml` for a specific template.

### List Local Templates

```bash
sitegen templates list
```

This scans `./templates/*` in the current project and installed packages whose names include `sitegen-template`.

### Init A Content Project

```bash
sitegen init
```

Creates:

```txt
content/site.yaml
sitegen.config.json
```

The generated config points at `./template`, `./content/site.yaml`, and `./site`.

### Scaffold A Template

```bash
sitegen create-template ./template
```

Creates a minimal Astro-compatible template with a `Hero` component and `sitegen.template.json`.

## Optional Config File

You do not need a config file. Flags and defaults are enough.

For repeatable projects, add `sitegen.config.json`:

```json
{
  "template": "./template",
  "content": "./content/site.yaml",
  "output": "./site"
}
```

Then run:

```bash
sitegen generate
sitegen validate
```

Resolution priority:

```txt
1. CLI flags
2. sitegen.config.json / sitegen.config.yaml
3. built-in defaults
```

## Content Format

The default content file is YAML:

```yaml
site:
  name: "Acme Studio"
  tagline: "Reusable content-driven websites."

navigation:
  navbar:
    links:
      - { label: "Work", href: "/" }
      - { label: "Contact", href: "/" }
  footer:
    links:
      - { label: "Privacy", href: "/" }

pages:
  - slug: ""
    title: "Acme Studio"
    sections:
      - type: hero
        heading: "Launch content-driven sites from reusable templates."
        subheading: "YAML content becomes a static site."
        buttons:
          - { label: "Start Building", href: "/" }

      - type: card-grid
        heading: "Why it works"
        cards:
          - title: "Template-owned design"
            body: "The template controls components and layout."
          - title: "Content-owned pages"
            body: "YAML controls routes and section props."
```

Each page has:

- `slug`: route path. Empty string generates `index.astro`.
- `title`: page title.
- `sections`: ordered list of component sections.

Each section has:

- `type`: maps to a template component.
- remaining fields: passed as component props.

You can also use `props` explicitly:

```yaml
sections:
  - type: hero
    props:
      heading: "Hello"
      subheading: "World"
```

Both forms are supported.

## Template Format

A template is a normal project folder with one metadata file:

```txt
template/
  package.json
  sitegen.template.json
  astro.config.mjs
  src/
    components/
      Hero.astro
      CardGrid.astro
    layouts/
      BaseLayout.astro
    styles/
      global.css
```

The generated site receives the regular project files:

```txt
package.json
astro.config.mjs
src/
```

The generated site does not receive:

```txt
sitegen.template.json
node_modules/
dist/
.astro/
.cache/
.wrangler/
```

## Template Metadata

Minimal `sitegen.template.json`:

```json
{
  "name": "basic",
  "description": "Minimal Astro template for static content sites."
}
```

Optional generated path configuration:

```json
{
  "name": "basic",
  "description": "Minimal Astro template for static content sites.",
  "generated": {
    "pagesDir": "src/pages",
    "siteData": "src/data/site-data.js",
    "layout": "src/layouts/BaseLayout.astro",
    "componentsDir": "src/components"
  }
}
```

Defaults:

```txt
pagesDir:      src/pages
siteData:      src/data/site-data.js
layout:        src/layouts/BaseLayout.astro
componentsDir: src/components
```

Optional component groups:

```json
{
  "componentGroups": [
    {
      "name": "Core Sections",
      "components": ["hero", "card-grid", "cta-block"]
    }
  ]
}
```

## Component Discovery

Components are discovered from:

```txt
src/components/*.astro
```

Filenames become section types:

```txt
Hero.astro      -> hero
CardGrid.astro  -> card-grid
CtaBlock.astro  -> cta-block
```

You can add richer metadata using a `@sitegen` YAML comment:

```astro
---
/**
 * @sitegen component
 * type: hero
 * name: Hero
 * description: Intro section with heading, subheading, and optional buttons.
 * group: Core Sections
 * props:
 *   heading:
 *     type: string
 *     required: true
 *   subheading:
 *     type: string
 *     required: false
 *   buttons:
 *     type: array
 *     required: false
 */
const { heading, subheading, buttons = [] } = Astro.props;
---
```

The CLI uses this metadata for:

- `sitegen templates inspect`
- `sitegen templates prompt`
- better LLM context

## Template Overrides

If filename inference is not enough, add component overrides in `sitegen.template.json`:

```json
{
  "components": {
    "cta": {
      "component": "CtaBlock",
      "description": "Short alias for the call-to-action section."
    }
  }
}
```

Hide implementation-only components:

```json
{
  "privateComponents": ["navbar", "footer", "button"]
}
```

## Generated Astro Contract

The default renderer expects:

```txt
src/layouts/BaseLayout.astro
src/components/{Component}.astro
```

Generated pages import:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { site, navigation } from '../data/site-data.js';
import Hero from '../components/Hero.astro';
---
<BaseLayout title="..." site={site} navigation={navigation}>
  <Hero heading="..." />
</BaseLayout>
```

`src/data/site-data.js` contains:

```js
export const site = { ... };
export const navigation = { ... };
```

## Local Template Example

Use a template from any local folder:

```bash
sitegen generate \
  --template ../templates/basic \
  --content ./content/site.yaml \
  --output ./site
```

This is the recommended workflow while templates are being developed locally.

## Installed Template Example

If you later publish a template package, users can install and reference it by package name:

```bash
npm install -D @your-org/sitegen-template-marketing

sitegen generate \
  --template @your-org/sitegen-template-marketing \
  --content ./content/site.yaml \
  --output ./site
```

## Notes

- Templates are not bundled into `@codebolt/agent-sitegen`.
- Config is optional.
- YAML and JSON content files are supported.
- The current renderer is Astro-oriented.
- The template should own framework-specific dependencies and deployment setup.
