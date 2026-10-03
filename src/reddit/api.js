let token = null;
let tokenExp = 0;

async function getToken(cfg, env) {
  if (token && Date.now() < tokenExp) return token;
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(env.REDDIT_CLIENT_ID + ':' + env.REDDIT_CLIENT_SECRET).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': cfg.userAgent
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: env.REDDIT_USERNAME,
      password: env.REDDIT_PASSWORD
    })
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('OAuth token request failed: ' + res.status);
  token = j.access_token;
  tokenExp = Date.now() + (j.expires_in - 60) * 1000;
  return token;
}

function normalize(child, sub, kind) {
  const d = child.data;
  return {
    id: d.id,
    kind,
    subreddit: sub,
    title: d.title || '',
    body: d.body || d.selftext || '',
    author: d.author || '',
    url: 'https://www.reddit.com' + (d.permalink || ''),
    createdUtc: d.created_utc || 0,
    parentId: kind === 'comments' ? d.link_id : null
  };
}

export async function fetchListing(cfg, env, sub, kind, gate, sinceUtc) {
  const out = [];
  let after = null;
  for (let page = 0; page < 3; page++) {
    if (!gate.canRead()) break;
    gate.noteRead();
    const t = await getToken(cfg, env);
    const qs = new URLSearchParams({ limit: '100', raw_json: '1' });
    if (after) qs.set('after', after);
    const endpoint = kind === 'posts' ? 'new' : 'comments';
    const res = await fetch(`https://oauth.reddit.com/r/${sub}/${endpoint}?${qs}`, {
      headers: { Authorization: 'Bearer ' + t, 'User-Agent': cfg.userAgent }
    });
    if (!res.ok) break;
    const j = await res.json();
    const children = j.data?.children || [];
    for (const c of children) {
      const item = normalize(c, sub, kind);
      if (sinceUtc && item.createdUtc < sinceUtc) return out;
      out.push(item);
    }
    after = j.data?.after || null;
    if (!after) break;
  }
  return out;
}

export async function postComment(cfg, env, thingId, text) {
  const t = await getToken(cfg, env);
  const res = await fetch('https://oauth.reddit.com/api/comment', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + t,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': cfg.userAgent
    },
    body: new URLSearchParams({ thing_id: thingId, text, raw_json: '1' })
  });
  const j = await res.json();
  if (j.json?.errors?.length) throw new Error('comment rejected: ' + JSON.stringify(j.json.errors));
  return j.json?.data?.things?.[0]?.data?.id || null;
}
