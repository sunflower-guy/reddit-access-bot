// Transition read source. Reddit retires RSS on 2026-11-13; delete this file
// and switch config.readSource to "api" once API approval is granted.
const unescape = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

function parseEntries(xml, sub, kind) {
  const out = [];
  const re = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const grab = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(block);
      return r ? unescape(r[1].trim()) : '';
    };
    const link = /<link href="([^"]+)"/.exec(block);
    const updated = grab('updated');
    out.push({
      id: grab('id').split('_').pop() || grab('id'),
      kind,
      subreddit: sub,
      title: grab('title'),
      body: kind === 'comments' ? grab('content') : '',
      author: grab('name'),
      url: link ? link[1] : '',
      createdUtc: updated ? Math.floor(Date.parse(updated) / 1000) : 0
    });
  }
  return out;
}

export async function fetchListing(cfg, sub, kind, gate) {
  if (!gate.canRead()) return [];
  gate.noteRead();
  const feed = kind === 'posts' ? 'new' : 'comments';
  const res = await fetch(`https://www.reddit.com/r/${sub}/${feed}.rss?limit=100`, {
    headers: { 'User-Agent': cfg.userAgent }
  });
  if (!res.ok) return [];
  return parseEntries(await res.text(), sub, kind);
}
