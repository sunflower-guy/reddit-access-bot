// Return the exact, unique, on-topic reply to post for a matched item, or null
// to skip. Never return a fixed template: the Responsible Builder Policy
// prohibits posting identical or substantially similar content across
// subreddits. Default is null so the bot is read-only until you implement this.
export function composeComment(item) {
  return null;
}
