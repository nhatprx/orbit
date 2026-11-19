import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MAX_LOC = 200;
const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.java', '.css']);
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'target', '.git']);
const EMOJI_RE = /\p{Extended_Pictographic}/u;
const ROUNDED_RE = /\brounded(?:-(?!none\b)(?:(?:[tblrse]{1,2}-)?(?:sm|md|lg|xl|2xl|3xl|full|\[[^\]]+\]))|\b(?!-))/;

const errors = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (SOURCE_EXTS.has(path.extname(entry.name))) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  if (lines.length >= MAX_LOC) {
    errors.push(`[LOC] ${rel}: ${lines.length} lines (limit < ${MAX_LOC})`);
  }
  if (EMOJI_RE.test(content)) {
    errors.push(`[EMOJI] ${rel}: emoji character detected`);
  }
  if (ROUNDED_RE.test(content)) {
    errors.push(`[STYLE] ${rel}: forbidden rounded-* class detected`);
  }
}

walk(path.join(ROOT, 'frontend', 'src'));
walk(path.join(ROOT, 'backend', 'src'));
walk(path.join(ROOT, 'ponytail'));

const indexHtml = path.join(ROOT, 'frontend', 'index.html');
if (fs.existsSync(indexHtml)) {
  checkFile(indexHtml);
}

if (errors.length > 0) {
  console.error('ponytail compliance check failed:\n' + errors.join('\n'));
  process.exit(1);
}

console.log('ponytail compliance check passed (< 200 LOC, zero-emoji, square-border).');
