class RSSService {
  constructor() {
    this.baseUrl = 'https://api.pullpush.io/reddit/search/submission/';
    // Track seen post IDs to avoid re-processing across poll cycles
    this.seenPostIds = new Set();
  }

  async fetchSubreddits(subreddits) {
    const results = [];

    for (const subreddit of subreddits) {
      const feedData = await this.fetchFeed(subreddit);
      if (feedData) {
        results.push(feedData);
      }
      // PullPush rate limit: 15 req/min soft, 30 req/min hard
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return results;
  }

  async fetchFeed(subreddit) {
    const cleanSubreddit = subreddit.replace(/^\/r\/|^\//, '');
    // Look back 6 hours — PullPush has ingestion delay so recent posts take time to appear
    const after = Math.floor(Date.now() / 1000) - (6 * 60 * 60);
    const url = `${this.baseUrl}?subreddit=${cleanSubreddit}&size=25&sort=desc&sort_type=created_utc&after=${after}`;

    try {
      console.log(`Fetching feed: r/${cleanSubreddit}`);
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Error fetching r/${cleanSubreddit}: Status code ${response.status}`);
        return null;
      }

      const data = await response.json();
      const posts = data?.data || [];

      if (posts.length === 0) {
        console.log(`No posts found for r/${cleanSubreddit}`);
        return null;
      }

      // Filter out posts we've already processed
      const newPosts = posts.filter(p => !this.seenPostIds.has(p.id));

      // Mark these posts as seen
      newPosts.forEach(p => this.seenPostIds.add(p.id));

      // Cap the seen set at 10,000 to prevent unbounded memory growth
      if (this.seenPostIds.size > 10000) {
        const entries = [...this.seenPostIds];
        this.seenPostIds = new Set(entries.slice(-5000));
      }

      console.log(`r/${cleanSubreddit}: ${posts.length} fetched, ${newPosts.length} new`);

      if (newPosts.length === 0) {
        return null;
      }

      return {
        feedTitle: cleanSubreddit,
        feedUrl: url,
        items: newPosts.map(p => ({
          id: p.id || p.permalink,
          title: p.title || '',
          link: p.permalink ? `https://www.reddit.com${p.permalink}` : p.url || '',
          author: p.author || '',
          pubDate: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : null,
          content: p.selftext || '',
          contentSnippet: (p.selftext || '').substring(0, 500)
        }))
      };
    } catch (error) {
      console.error(`Error fetching feed for r/${cleanSubreddit}:`, error.message);
      return null;
    }
  }
}

export default RSSService;
