import Parser from 'rss-parser';

class RSSService {
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['author', 'id', 'link', 'pubDate', 'title', 'content']
      },
      headers: {
        'User-Agent': 'TerrenceListens/1.0 (RSS Feed Reader)'
      }
    });
  }

  buildRedditRSSUrl(subreddit) {
    const cleanSubreddit = subreddit.replace(/^\/r\/|^\//, '');
    return `https://www.reddit.com/r/${cleanSubreddit}.rss`;
  }

  async fetchSubreddits(subreddits) {
    const feedUrls = subreddits.map(subreddit => this.buildRedditRSSUrl(subreddit));
    return this.fetchMultipleFeeds(feedUrls);
  }

  async fetchFeed(feedUrl) {
    try {
      console.log(`Fetching RSS feed: ${feedUrl}`);
      const feed = await this.parser.parseURL(feedUrl);
      
      return {
        feedTitle: feed.title,
        feedUrl: feedUrl,
        items: feed.items.map(item => ({
          id: item.id || item.link,
          title: item.title,
          link: item.link,
          author: item.author,
          pubDate: item.pubDate,
          content: item.content || item.summary || item.description,
          contentSnippet: item.contentSnippet
        }))
      };
    } catch (error) {
      console.error(`Error fetching RSS feed ${feedUrl}:`, error.message);
      return null;
    }
  }

  async fetchMultipleFeeds(feedUrls) {
    const results = [];
    
    for (const feedUrl of feedUrls) {
      const feedData = await this.fetchFeed(feedUrl);
      if (feedData) {
        results.push(feedData);
      }
    }
    
    return results;
  }
}

export default RSSService;