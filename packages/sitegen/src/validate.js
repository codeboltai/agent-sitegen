export function validateContent(config, template) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    errors.push(error('content', '', 'invalid-content', 'Content must be an object.'));
    return errors;
  }

  if (!config.site || typeof config.site !== 'object') {
    errors.push(error('content', 'site', 'missing-site', 'Missing required "site" object.'));
  }

  if (!Array.isArray(config.pages)) {
    errors.push(error('content', 'pages', 'missing-pages', 'Missing required "pages" array.'));
    return errors;
  }

  config.pages.forEach((page, pageIndex) => {
    if (!page || typeof page !== 'object') {
      errors.push(error('content', `pages[${pageIndex}]`, 'invalid-page', 'Page must be an object.'));
      return;
    }

    if (!Array.isArray(page.sections)) {
      errors.push(error('content', `pages[${pageIndex}].sections`, 'missing-sections', 'Page sections must be an array.'));
      return;
    }

    page.sections.forEach((section, sectionIndex) => {
      const path = `pages[${pageIndex}].sections[${sectionIndex}]`;
      if (!section || typeof section !== 'object') {
        errors.push(error('content', path, 'invalid-section', 'Section must be an object.'));
        return;
      }

      if (!section.type) {
        errors.push(error('content', `${path}.type`, 'missing-section-type', 'Section must include a type.'));
        return;
      }

      if (!template.components[section.type]) {
        errors.push(error(
          'content',
          `${path}.type`,
          'unknown-section',
          `Unknown section type: ${section.type}`,
          `Use one of: ${Object.keys(template.components).sort().join(', ')}`,
        ));
      }
    });
  });

  return errors;
}

function error(source, path, code, message, hint) {
  return { source, path, code, message, hint };
}

