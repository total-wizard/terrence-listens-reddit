import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import RSSService from './rssService.js';
import CommentMarketingFilter from './commentMarketingFilter.js';
import SlackService from './slackService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CommentMarketingService {
  constructor() {
    this.rssService = new RSSService();
    this.filter = new CommentMarketingFilter();
    this.slack = new SlackService();

    this.subreddits = this.loadSubreddits();

    console.log(`[CommentMarketing] Monitoring ${this.subreddits.length} subreddits`);
    this.subreddits.forEach(sub => console.log(`[CommentMarketing] - /r/${sub}`));
  }

  loadSubreddits() {
    try {
      const configPath = join(__dirname, '..', 'config.json');
      const configFile = readFileSync(configPath, 'utf8');
      const config = JSON.parse(configFile);
      return config.commentMarketingSubreddits || [];
    } catch (error) {
      console.error('[CommentMarketing] Error loading config:', error.message);
      return [];
    }
  }

  async startup() {
    await this.slack.sendStartupPing();
  }

  async poll() {
    try {
      console.log(`\n[${new Date().toISOString()}] [CommentMarketing] Starting poll...`);

      const feedsData = await this.rssService.fetchSubreddits(this.subreddits);

      if (feedsData.length === 0) {
        console.log('[CommentMarketing] No feeds fetched');
        return;
      }

      let allPosts = [];
      feedsData.forEach(feed => {
        allPosts = allPosts.concat(feed.items);
      });

      console.log(`[CommentMarketing] Fetched ${allPosts.length} posts, filtering...`);

      const matches = await this.filter.filterPosts(allPosts);

      console.log(`[CommentMarketing] ${matches.length} matches out of ${allPosts.length} posts`);

      let sent = 0;
      for (const { post, evaluation } of matches) {
        const success = await this.slack.sendMatch(post, evaluation);
        if (success) sent++;
      }

      console.log(`[CommentMarketing] Sent ${sent} notifications to Slack`);
    } catch (error) {
      console.error('[CommentMarketing] Error during poll:', error);
    }
  }
}

export default CommentMarketingService;
