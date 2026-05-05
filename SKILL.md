# Agent Sitegen

Use this skill when a user wants to create, generate, validate, or maintain a static website with Agent Sitegen.

Agent Sitegen is designed for agentic website workflows: an LLM can write or update structured content, extend a reusable template when new UI sections are needed, and regenerate the website through the CLI.

## When To Use

Use this skill when the user asks to:

- Generate a website from a YAML or JSON content file.
- Create or update `site.yaml`.
- Convert notes, product information, docs, or marketing content into a generated site.
- Update a template so future generations include new layout or component capabilities.
- Add a new component type that content can reference.
- Validate content against a template before generation.
- Generate an Astro, Cloudflare, or static deployment-ready site from a template.

Do not use this skill for one-off hand-coded pages when the user specifically wants direct application edits instead of a generated site workflow.

## Core Model

Agent Sitegen has three moving pieces:

- `content`: Structured website content, usually `content/site.yaml`.
- `template`: A reusable site template folder containing `sitegen.template.json` and the actual app files.
- `output`: The generated site folder, usually `site/`.

The normal loop is:

1. Update the content file.
2. Update the template if the content needs a section/component that does not exist yet.
3. Validate.
4. Generate.
5. Build or preview the generated site.

## Common Commands

Validate content against a template:

```bash
sitegen validate --template ./template --content ./content/site.yaml
```

Generate a site:

```bash
sitegen generate --template ./template --content ./content/site.yaml --output ./site
```

Use a config file when present:

```bash
sitegen generate
```

Typical generated-site checks:

```bash
npm install --prefix ./site
npm run --prefix ./site build
```

## Agent Workflow

When working in an existing Agent Sitegen project:

1. Inspect `sitegen.config.json` or package scripts if they exist.
2. Inspect the template manifest at `template/sitegen.template.json` or the template path named by config/scripts.
3. Inspect the content file, usually `content/site.yaml`.
4. Compare content section types with the template's supported components.
5. If a content need is already supported, update only content.
6. If a new visual/content pattern is needed, add or update a template component first.
7. Register the new component in `sitegen.template.json`.
8. Validate content.
9. Generate the site.
10. Build the generated site when the template provides a buildable app.

Prefer content-only edits when possible. Extend the template when the site needs a reusable capability, not for a single hard-coded page exception.

## Content Authoring

LLMs should treat `site.yaml` as the source of truth for generated pages.

Good content files are:

- Structured and predictable.
- Written in terms of page sections.
- Free of framework-specific implementation details.
- Explicit about component or section types.
- Easy for another agent to modify later.

Example shape:

```yaml
site:
  title: Example Site
  description: A generated static website.

navigation:
  - label: Home
    href: /

pages:
  - slug: /
    title: Home
    sections:
      - type: hero
        eyebrow: Agent Sitegen
        title: Generate websites from structured content
        body: Update YAML, regenerate, and deploy.
        actions:
          - label: Get started
            href: /docs
      - type: card-grid
        title: Capabilities
        cards:
          - title: Content first
            body: Keep site copy and structure in YAML.
          - title: Template aware
            body: Add components when the design system needs to grow.
```

## Template Authoring

A template is the template root. Avoid nesting another `template/` folder inside it unless the package intentionally contains multiple templates.

Recommended template shape:

```txt
template/
  sitegen.template.json
  package.json
  astro.config.mjs
  src/
    components/
    layouts/
    styles/
  public/
```

`sitegen.template.json` describes the generation contract. It should document generated paths and public component types the content can use.

Component metadata can also live beside the component code. The CLI discovers `src/components/*.{astro,jsx,tsx}` files and reads a JSDoc block that contains `@sitegen`. The remaining lines in that block are parsed as YAML metadata.

Example component metadata:

```astro
---
/**
 * @sitegen
 * type: hero
 * description: Top-of-page hero section.
 * group: Hero Sections
 * props:
 *   title:
 *     type: string
 *     required: true
 *   body:
 *     type: string
 *   actions:
 *     type: array
 */
const { title, body, actions = [] } = Astro.props;
---
```

Use component comments for metadata that belongs to the component itself: type, description, group, and prop hints. Use `sitegen.template.json` for template-level metadata: template name, generated paths, component groups, private/excluded components, and explicit overrides.

Example:

```json
{
  "name": "astro-cloudflare",
  "description": "Astro static site template deployable to Cloudflare Pages.",
  "generated": {
    "siteData": "src/data/site-data.js",
    "pagesDir": "src/pages"
  },
  "components": {
    "hero": {
      "component": "Hero",
      "description": "Top-of-page hero section"
    },
    "card-grid": {
      "component": "CardGrid",
      "description": "Grid of reusable cards"
    }
  }
}
```

## Adding A New Component

When content needs a new section type:

1. Choose a stable kebab-case section type, such as `logo-cloud`, `timeline`, or `feature-comparison`.
2. Add a component in the template, such as `src/components/LogoCloud.astro`.
3. Follow the template's existing component style, data conventions, CSS system, and accessibility patterns.
4. Add an `@sitegen` metadata comment to the component, or add the component entry to `sitegen.template.json`.
5. Update the renderer or section mapping if the template uses an explicit component map.
6. Add content using the new section type to `site.yaml`.
7. Run `sitegen validate`.
8. Run `sitegen generate`.
9. Build the generated site.

The component should be reusable. Avoid baking one page's copy directly into the component.

## Validation Rules

Always validate before generation when practical.

If validation fails:

- Fix content if the section data is malformed.
- Fix the template manifest if the component exists but is not declared.
- Add the missing template component if the content requires a real new section type.

Do not silently remove content to make validation pass unless the user requested that content be deleted.

## Generation Rules

Generated output can be overwritten. Make source changes in `content/` or `template/`, not directly in generated pages, unless the user explicitly asks for a temporary patch.

If a bug appears in generated output, fix the generator or template source and regenerate.

## Deployment Notes

For Cloudflare-oriented templates, ensure the generated site includes the deployment files expected by the platform, such as:

- `wrangler.jsonc` or `wrangler.toml`
- `package.json` scripts for `build`, `dev`, and optionally `deploy`
- Static build output configuration, usually `dist`
- Any required public assets, including ignore files referenced by deployment config

When the user reports a deployment error, trace whether the missing file should be generated by the template or copied from content/assets, then update the template so future generations include the fix.

## Agent Guidelines

- Keep content, template, and generated output responsibilities separate.
- Prefer reusable components over one-off generated markup.
- Preserve existing project style and framework choices.
- Run validation and build checks before reporting completion.
- Mention when a build could not be run and why.
- If a generated site is already committed, expect many generated files to change after regeneration.
