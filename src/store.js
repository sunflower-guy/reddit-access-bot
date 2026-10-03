import fs from 'node:fs';
import path from 'node:path';

const DIR = 'data';
const FILE = path.join(DIR, 'items.jsonl');

export function ensureStore() {
  fs.mkdirSync(DIR, { recursive: true });
}

export function loadSeen() {
  if (!fs.existsSync(FILE)) return new Set();
  return new Set(
    fs.readFileSync(FILE, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => JSON.parse(l).id)
  );
}

export function appendItems(items) {
  if (!items.length) return;
  fs.appendFileSync(FILE, items.map((i) => JSON.stringify(i)).join('\n') + '\n');
}
