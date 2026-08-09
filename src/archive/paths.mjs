import path from 'node:path';

export function articleDirectoryName(index, title) {
  const number = String(index).padStart(3, '0');
  const normalized = String(title)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
  const capped = [...normalized].slice(0, 96).join('').replace(/-+$/g, '');
  return `${number}-${capped}`;
}

export function articleDirectoryPath(root, radarTitle, index, title) {
  return path.join(root, radarTitle, 'articles', articleDirectoryName(index, title));
}
