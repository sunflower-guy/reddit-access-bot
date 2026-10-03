# reddit-access-bot

Personal, non-commercial Node.js tool that reads public Reddit discussions for
keyword monitoring and research, and (once Reddit grants explicit API approval)
posts low-frequency, on-topic comments from my own single account.

Zero dependencies. Node >= 20.

## Status

- Registered on the Reddit Developer Platform app-registration on **2026-10-03**
  (status: Registered, awaiting explicit approval).
- **No API credentials live in this repository.** `.env` is gitignored; only
  `.env.example` is committed. API mode refuses to start without credentials.
- Until approval is granted, the read side uses public RSS feeds
  (`config.readSource = "rss"`). Reddit retires RSS on **2026-11-13**; once API
  access is approved, switch `readSource` to `"api"` and delete
  `src/reddit/rss.js`.

## Purpose and scope (Responsible Builder Policy)

- Non-commercial personal research. No selling, licensing, sharing or
  redistributing Reddit data; no user-facing product; no AI/ML training.
- **Read scope:** public post and comment listings for the subreddits in
  `config.readSubreddits` (topic-driven set). Only listing endpoints are called,
  paginated with `after`, stopping at items older than the previous poll.
- **Write scope:** comments from my single personal account, only in
  `config.writeSubreddits`, capped by `maxCommentsPerDay` (default 5) with at
  least `minCommentIntervalMs` (default 2 h) between writes, enforced by
  `src/rate.js`. `src/compose.js` returns `null` by default, so the bot is
  **read-only** until a unique, per-item reply is implemented — the policy
  prohibits posting identical or substantially similar content across
  subreddits, so no fixed template is used.
- **Rate budget:** reads/day = (86400000 / pollIntervalMs) x |readSubreddits| x 2
  endpoints x pages (<= 3). Defaults (10 min poll, 3 subreddits, 1 page) ≈ 864
  requests/day, inside the `maxReadRequestsPerDay` = 1000 cap that `src/rate.js`
  hard-enforces. Adding subreddits requires lowering the poll rate accordingly.
- Per the policy, apps should have a clearly specified purpose and scope of
  access, only accessing the subreddits and API actions they need and which are
  permitted. This repository implements that as configuration and rate gates,
  and the bot account is used solely for app functions.

## Why this is not a Devvit app

1. Devvit apps execute only inside Reddit's sandboxed runtime; they cannot run
   on my own server or write to my own datastore.
2. Devvit apps must be installed per-community by a moderator, so a personal
   tool that reads a topic-driven set of subreddits I do not moderate and stores
   the data locally for longitudinal keyword monitoring is not installable.
3. Devvit provides no way to authenticate as my own account from external
   infrastructure to post low-frequency comments via the standard OAuth2
   script-app flow.

## Setup

1. `cp .env.example .env` and fill it in **after** approval. Create the app at
   `old.reddit.com/prefs/apps` with type **script** and redirect uri
   `http://localhost:8080`.
2. Fill `config.json`: `keywords`, `readSubreddits`, `writeSubreddits`, and put
   your Reddit username in `userAgent`.
3. `npm start` (or `node src/bot.js`).

## Layout

| Path | Role |
| --- | --- |
| `src/bot.js` | poll loop, keyword match, write gate |
| `src/source.js` | picks RSS (transition) or OAuth2 API reads; writes always API |
| `src/reddit/rss.js` | transition read source, delete after 2026-11-13 |
| `src/reddit/api.js` | OAuth2 password-grant script app, listings + comment |
| `src/rate.js` | daily read cap, daily write cap, min write interval |
| `src/compose.js` | per-item unique reply hook; `null` = read-only |
| `src/store.js` | local append-only JSONL store of seen items |

## Data handling

Matched and seen items are appended to `data/items.jsonl` (gitignored) for
personal longitudinal monitoring only. The store is deleted on request and
re-queries honour removals by re-polling live listings.
