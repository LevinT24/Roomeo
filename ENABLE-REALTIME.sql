-- ===============================
-- Enable Supabase Real-time for Chat Tables
-- ===============================

-- Enable real-time for messages table (most important for chat)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable real-time for chats table (for chat list updates)
ALTER PUBLICATION supabase_realtime ADD TABLE chats;

-- Optional: Enable for matches table (for live match notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- Verify the tables are added to real-time
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';