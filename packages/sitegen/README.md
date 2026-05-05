# @codebolt/agent-sitegen

Reusable CLI for generating static sites from content files and external templates.

The CLI does not assume templates are bundled. By default it looks in the project where it is run:

```txt
./template
./content/site.yaml
./site
```

Use flags when the template, content, or output live elsewhere:

```bash
sitegen generate --template ./template --content ./content/site.yaml --output ./site
sitegen validate --template ./template --content ./content/site.yaml
sitegen templates inspect ./template --json
sitegen templates prompt ./template
```

Templates can be local folders or installed npm packages. A template can include `sitegen.template.json`, but component metadata is also inferred from `src/components/*.astro` filenames.

The template root can be a normal project folder. Its `package.json`, `src/`, config files, and public assets are copied into the output. `sitegen.template.json` is generator metadata and is skipped during copy.
