export function parseArgs(argv) {
  const positional = [];
  const flags = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    const raw = arg.slice(2);
    const eqIndex = raw.indexOf('=');
    if (eqIndex !== -1) {
      flags[toCamel(raw.slice(0, eqIndex))] = raw.slice(eqIndex + 1);
      continue;
    }

    const key = toCamel(raw);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }

  return { positional, flags };
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

