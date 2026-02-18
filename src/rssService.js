class RSSService {
  constructor() {
    this.headers = {
      'User-Agent': 'TerrenceListens/1.0 (Reddit Feed Reader; +https://github.com/total-wizard/terrence-listens-reddit)',
      'Accept': 'application/json'
    };
  }

  buildRedditJsonUrl(subreddit) {
    const cleanSubreddit = subreddit.replace(/^\/r\/|^\//, '');
    return `https://www.reddit.com/r/${cleanSubreddit}.json?limit=25`;
  }

  async fetchSubreddits(subreddits) {
    const results = [];

    for (const subreddit of subreddits) {
      const feedData = await this.fetchFeed(subreddit);
      if (feedData) {
        results.push(feedData);
      }
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  async fetchFeed(subreddit) {
    const url = this.buildRedditJsonUrl(subreddit);
    try {
      console.log(`Fetching feed: ${url}`);
      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        console.error(`Error fetching ${url}: Status code ${response.status}`);
        return null;
      }

      const data = await response.json();
      const posts = data?.data?.children || [];

      return {
        feedTitle: subreddit,
        feedUrl: url,
        items: posts.map(post => {
          const p = post.data;
          return {
            id: p.id || p.permalink,
            title: p.title,
            link: `https://www.reddit.com${p.permalink}`,
            author: p.author,
            pubDate: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : null,
            content: p.selftext || '',
            contentSnippet: (p.selftext || '').substring(0, 500)
          };
        })
      };
    } catch (error) {
      console.error(`Error fetching feed ${url}:`, error.message);
      return null;
    }
  }
}

export default RSSService;
