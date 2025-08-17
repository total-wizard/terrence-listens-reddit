import { createClient } from '@supabase/supabase-js';

class SupabaseService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  async createTablesIfNotExist() {
    try {
      const { error } = await this.client.rpc('create_reddit_feeds_table');
      if (error && !error.message.includes('already exists')) {
        console.error('Error creating table:', error);
      }
    } catch (error) {
      console.log('Table creation handled by migration or already exists');
    }
  }

  async saveFeedItems(feedData) {
    try {
      const itemsToInsert = feedData.items.map(item => ({
        feed_url: feedData.feedUrl,
        feed_title: feedData.feedTitle,
        item_id: item.id,
        title: item.title,
        link: item.link,
        author: item.author,
        pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        content: item.content,
        content_snippet: item.contentSnippet,
        created_at: new Date().toISOString(),
        // LLM evaluation data
        llm_viable: item.llm_evaluation?.viable || null,
        llm_reason: item.llm_evaluation?.reason || null,
        llm_tech_stack: item.llm_evaluation?.tech_stack_ideas ? JSON.stringify(item.llm_evaluation.tech_stack_ideas) : null,
        llm_complexity: item.llm_evaluation?.complexity || null,
        llm_raw_response: item.llm_evaluation?.raw_response || null
      }));

      const { data, error } = await this.client
        .from('reddit_feeds')
        .upsert(itemsToInsert, { 
          onConflict: 'item_id',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error('Error saving feed items:', error);
        return false;
      }

      console.log(`Saved ${itemsToInsert.length} items from ${feedData.feedTitle}`);
      return true;
    } catch (error) {
      console.error('Error in saveFeedItems:', error);
      return false;
    }
  }

  async saveAllFeeds(feedsData) {
    let totalSaved = 0;
    
    for (const feedData of feedsData) {
      const success = await this.saveFeedItems(feedData);
      if (success) {
        totalSaved += feedData.items.length;
      }
    }
    
    console.log(`Total items processed: ${totalSaved}`);
    return totalSaved;
  }

  async getRecentItems(limit = 10) {
    try {
      const { data, error } = await this.client
        .from('reddit_feeds')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent items:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error in getRecentItems:', error);
      return [];
    }
  }
}

export default SupabaseService;