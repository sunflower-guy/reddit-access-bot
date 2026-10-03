import fs from 'node:fs';
import { loadEnv } from './env.js';
import { ensureStore, loadSeen, appendItems } from './store.js';
import { RateGate } from './rate.js';
import { createSource } from './source.js';
import { composeComment } from './compose.js';

const cfg = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
const env = loadEnv();

for (const key of ['keywords', 'readSubreddits', 'writeSubreddits']) {
  if (!Array.isArray(cfg[key]) || cfg[key].length === 0) {
    console.error(`config.json: "${key}" is empty. Fill in your real subreddits/keywords before running.`);
    process.exit(1);
  }
}
if (cfg.readSource === 'api') {
  for (const key of ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_USERNAME', 'REDDIT_PASSWORD']) {
    if (!env[key]) {
      console.error(`.env: missing ${key}. API mode requires approved script-app credentials.`);
      process.exit(1);
    }
  }
}

const gate = new RateGate(cfg);
const source = createSource(cfg, env, gate);
const lowered = cfg.keywords.map((k) => k.toLowerCase());

const matches = (item) => {
  const hay = (item.title + ' ' + item.body).toLowerCase();
  return lowered.some((k) => hay.includes(k));
};

async function poll(sinceUtc) {
  const seen = loadSeen();
  const fresh = [];
  for (const sub of cfg.readSubreddits) {
    for (const kind of ['posts', 'comments']) {
      const items = await (kind === 'posts'
        ? source.fetchPosts(sub, sinceUtc)
        : source.fetchComments(sub, sinceUtc));
      for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        fresh.push(item);
      }
    }
  }
  appendItems(fresh);

  for (const item of fresh) {
    if (!matches(item)) continue;
    console.log(`[match] r/${item.subreddit} ${item.kind} ${item.id} :: ${item.title || item.body.slice(0, 80)}`);
    if (!cfg.writeSubreddits.includes(item.subreddit)) continue;
    if (item.kind !== 'posts') continue;
    const text = composeComment(item);
    if (!text) continue;
    if (!gate.canWrite()) {
      console.log(`[skip] write gate open for ${item.id}`);
      continue;
    }
    const id = await source.comment('t3_' + item.id, text);
    gate.noteWrite();
    console.log(`[comment] posted ${id} on ${item.id}`);
  }
  return fresh.length;
}

ensureStore();
const startedUtc = Math.floor(Date.now() / 1000);
console.log(`polling every ${cfg.pollIntervalMs / 1000}s; read source = ${cfg.readSource}`);
poll(0).catch((e) => console.error(e));
setInterval(() => {
  poll(startedUtc).catch((e) => console.error(e));
}, cfg.pollIntervalMs);
