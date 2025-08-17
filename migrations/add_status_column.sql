-- Add status column to reddit_feeds table
ALTER TABLE reddit_feeds 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'new';

-- Add check constraint for valid status values
ALTER TABLE reddit_feeds 
ADD CONSTRAINT IF NOT EXISTS reddit_feeds_status_check 
CHECK (status IN ('new', 'reviewed', 'in_progress', 'implemented', 'rejected'));

-- Add index for efficient status filtering
CREATE INDEX IF NOT EXISTS idx_reddit_feeds_status ON reddit_feeds(status);

-- Update existing records to have 'new' status if null
UPDATE reddit_feeds SET status = 'new' WHERE status IS NULL;