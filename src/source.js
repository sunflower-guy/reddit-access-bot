import * as rss from './reddit/rss.js';
import * as api from './reddit/api.js';

export function createSource(cfg, env, gate) {
  const useApi = cfg.readSource === 'api';
  return {
    fetchPosts: (sub, sinceUtc) =>
      useApi ? api.fetchListing(cfg, env, sub, 'posts', gate, sinceUtc) : rss.fetchListing(cfg, sub, 'posts', gate),
    fetchComments: (sub, sinceUtc) =>
      useApi ? api.fetchListing(cfg, env, sub, 'comments', gate, sinceUtc) : rss.fetchListing(cfg, sub, 'comments', gate),
    comment: (thingId, text) => api.postComment(cfg, env, thingId, text)
  };
}
