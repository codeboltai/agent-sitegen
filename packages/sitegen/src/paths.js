import path from 'path';
import { fileURLToPath } from 'url';

export const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

export function slash(filePath) {
  return filePath.split(path.sep).join('/');
}

export function ensureRelativeImport(fromDir, targetFile) {
  let rel = slash(path.relative(fromDir, targetFile));
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

export function isPathLike(value) {
  return (
    value.startsWith('.') ||
    value.startsWith('/') ||
    /^[a-zA-Z]:[\\/]/.test(value)
  );
}

