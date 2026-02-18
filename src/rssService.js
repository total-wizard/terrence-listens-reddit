class RSSService {
  constructor() {
    this.baseUrl = 'https://api.pullpush.io/reddit/search/submission/';
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
    // Only fetch posts from the last 20 minutes (slightly wider than the 15-min poll interval)
    const after = Math.floor(Date.now() / 1000) - (20 * 60);
    const url = `${this.baseUrl}?subreddit=${cleanSubreddit}&size=25&sort=desc&sort_type=created_utc&after=${after}`;

    try {
      console.log(`Fetching feed: ${url}`);
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Error fetching ${cleanSubreddit}: Status code ${response.status}`);
        return null;
      }

      const data = await response.json();
      const posts = data?.data || [];

      if (posts.length === 0) {
        console.log(`No posts found for r/${cleanSubreddit}`);
        return null;
      }

      console.log(`Fetched ${posts.length} posts from r/${cleanSubreddit}`);

      return {
        feedTitle: cleanSubreddit,
        feedUrl: url,
        items: posts.map(p => ({
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
