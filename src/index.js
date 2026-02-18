import 'dotenv/config';
import cron from 'node-cron';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import RSSService from './rssService.js';
import SupabaseService from './supabaseService.js';
import LLMFilter from './llmFilter.js';
import CommentMarketingService from './commentMarketingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TerrenceListens {
  constructor() {
    this.rssService = new RSSService();
    this.supabaseService = new SupabaseService();
    this.llmFilter = new LLMFilter();
    
    this.subreddits = this.loadSubreddits();
        
    console.log(`Configured to monitor ${this.subreddits.length} subreddits`);
    this.subreddits.forEach(subreddit => console.log(`- /r/${subreddit}`));
  }

  loadSubreddits() {
    try {
      const configPath = join(__dirname, '..', 'config.json');
      const configFile = readFileSync(configPath, 'utf8');
      const config = JSON.parse(configFile);
      return config.subreddits || [];
    } catch (error) {
      console.error('Error loading config file, using defaults:', error.message);
      return ['programming', 'javascript', 'webdev'];
    }
  }

  async pollFeeds() {
    try {
      console.log(`\n[${new Date().toISOString()}] Starting RSS feed polling...`);
      
      const feedsData = await this.rssService.fetchSubreddits(this.subreddits);
      
      if (feedsData.length === 0) {
        console.log('No feeds successfully fetched');
        return;
      }
      
      let allPosts = [];
      feedsData.forEach(feed => {
        allPosts = allPosts.concat(feed.items);
      });
      
      console.log(`Fetched ${allPosts.length} total posts, now filtering with LLM...`);
      
      const filteredPosts = await this.llmFilter.filterPosts(allPosts);
      
      console.log(`LLM approved ${filteredPosts.length} out of ${allPosts.length} posts`);
      
      if (filteredPosts.length === 0) {
        console.log('No posts passed LLM filter');
        return;
      }
      
      const feedsWithFilteredData = [{
        feedTitle: 'Filtered Business Ideas',
        feedUrl: 'multiple_sources',
        items: filteredPosts
      }];
      
      const totalSaved = await this.supabaseService.saveAllFeeds(feedsWithFilteredData);
      console.log(`Polling completed. Total viable business ideas saved: ${totalSaved}`);
      
    } catch (error) {
      console.error('Error during polling:', error);
    }
  }

  async start() {
    try {
      console.log('🎧 Terrence Listens - Reddit RSS Feed Monitor Starting...');
      
      await this.supabaseService.createTablesIfNotExist();
      
      await this.pollFeeds();
      
      console.log('⏰ Setting up 15-minute polling schedule...');
      cron.schedule('*/15 * * * *', async () => {
        await this.pollFeeds();
      }, {
        scheduled: true,
        timezone: "UTC"
      });
      
      console.log('🚀 Service is running! Polling every 15 minutes.');

      // Comment Marketing Pipeline (stateless: RSS → LLM → Slack)
      if (process.env.SLACK_WEBHOOK_URL) {
        const commentMarketing = new CommentMarketingService();
        await commentMarketing.poll();

        cron.schedule('*/15 * * * *', async () => {
          await commentMarketing.poll();
        }, {
          scheduled: true,
          timezone: "UTC"
        });

        console.log('📣 Comment marketing pipeline is running!');
      } else {
        console.log('⚠️ SLACK_WEBHOOK_URL not set — comment marketing pipeline disabled');
      }

    } catch (error) {
      console.error('Failed to start service:', error);
      process.exit(1);
    }
  }
}

const service = new TerrenceListens();
service.start().catch(console.error);

process.on('SIGINT', () => {
  console.log('\n👋 Gracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Gracefully shutting down...');
  process.exit(0);
});