class RSSService {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    };
  }

  buildRedditJsonUrl(subreddit) {
    const cleanSubreddit = subreddit.replace(/^\/r\/|^\//, '');
    return `https://old.reddit.com/r/${cleanSubreddit}.json?limit=25`;
  }

  async fetchSubreddits(subreddits) {
    const results = [];

    for (const subreddit of subreddits) {
      const feedData = await this.fetchFeed(subreddit);
      if (feedData) {
        results.push(feedData);
      }
      // Delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  async fetchFeed(subreddit) {
    const url = this.buildRedditJsonUrl(subreddit);
    try {
      console.log(`Fetching feed: ${url}`);
      const response = await fetch(url, {
        headers: this.headers,
        redirect: 'follow'
      });

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
