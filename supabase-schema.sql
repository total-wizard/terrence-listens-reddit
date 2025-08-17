-- Create the reddit_feeds table
CREATE TABLE IF NOT EXISTS reddit_feeds (
  id BIGSERIAL PRIMARY KEY,
  feed_url TEXT NOT NULL,
  feed_title TEXT,
  item_id TEXT UNIQUE NOT NULL,
  title TEXT,
  link TEXT,
  author TEXT,
  pub_date TIMESTAMPTZ,
  content TEXT,
  content_snippet TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- LLM evaluation fields
  llm_viable BOOLEAN,
  llm_reason TEXT,
  llm_tech_stack JSONB,
  llm_complexity TEXT,
  llm_raw_response TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reddit_feeds_feed_url ON reddit_feeds(feed_url);
CREATE INDEX IF NOT EXISTS idx_reddit_feeds_created_at ON reddit_feeds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reddit_feeds_pub_date ON reddit_feeds(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_reddit_feeds_item_id ON reddit_feeds(item_id);
CREATE INDEX IF NOT EXISTS idx_reddit_feeds_llm_viable ON reddit_feeds(llm_viable);
CREATE INDEX IF NOT EXISTS idx_reddit_feeds_llm_complexity ON reddit_feeds(llm_complexity);

-- Enable RLS (Row Level Security) if needed
-- ALTER TABLE reddit_feeds ENABLE ROW LEVEL SECURITY;