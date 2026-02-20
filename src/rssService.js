import Parser from 'rss-parser';

class RSSService {
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['author', 'id', 'link', 'pubDate', 'title', 'content']
      }
    });
  }

  buildFeedUrl(subreddit) {
    const cleanSubreddit = subreddit.replace(/^\/r\/|^\//, '');
    return `https://openrss.org/reddit.com/r/${cleanSubreddit}`;
  }

  async fetchSubreddits(subreddits) {
    const results = [];

    for (const subreddit of subreddits) {
      const feedData = await this.fetchFeed(subreddit);
      if (feedData) {
        results.push(feedData);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  async fetchFeed(subreddit) {
    const url = this.buildFeedUrl(subreddit);
    try {
      console.log(`Fetching feed: ${url}`);
      const feed = await this.parser.parseURL(url);

      return {
        feedTitle: subreddit.replace(/^\/r\/|^\//, ''),
        feedUrl: url,
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
      console.error(`Error fetching feed ${url}:`, error.message);
      return null;
    }
  }
}

export default RSSService;
