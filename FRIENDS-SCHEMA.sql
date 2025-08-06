-- ===============================
-- Friends System Database Schema
-- Add to existing Supabase database
-- ===============================

-- 1. Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_friend_request UNIQUE(sender_id, receiver_id),
  CONSTRAINT no_self_request CHECK (sender_id != receiver_id)
);

-- 2. Create friendships table (for accepted friendships)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_friendship UNIQUE(user1_id, user2_id),
  CONSTRAINT ordered_friendship CHECK (user1_id < user2_id),
  CONSTRAINT no_self_friendship CHECK (user1_id != user2_id)
);

-- ===============================
-- Enable Row Level Security
-- ===============================

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- ===============================
-- Create RLS Policies
-- ===============================

-- Friend requests policies
CREATE POLICY "Users can view friend requests involving them" ON friend_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests they received" ON friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete friend requests they sent" ON friend_requests
  FOR DELETE USING (auth.uid() = sender_id);

-- Friendships policies  
CREATE POLICY "Users can view their friendships" ON friendships
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create friendships" ON friendships
  FOR INSERT WITH CHECK (true); -- Controlled by application logic

CREATE POLICY "Users can delete their friendships" ON friendships
  FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ===============================
-- Create Indexes for Performance
-- ===============================

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_created_at ON friend_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_friendships_created_at ON friendships(created_at);

-- ===============================
-- Create Triggers for Auto-Updates
-- ===============================

-- Trigger to update updated_at on friend_requests
CREATE TRIGGER update_friend_requests_updated_at 
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- Enable Real-time for Live Updates
-- ===============================

-- Enable real-time subscriptions for friend requests and friendships
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;

-- ===============================
-- Utility Functions
-- ===============================

-- Function to create friendship when friend request is accepted
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  request_record friend_requests%ROWTYPE;
  smaller_id UUID;
  larger_id UUID;
BEGIN
  -- Get the friend request
  SELECT * INTO request_record FROM friend_requests 
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Ensure consistent ordering (smaller UUID first)
  IF request_record.sender_id < request_record.receiver_id THEN
    smaller_id := request_record.sender_id;
    larger_id := request_record.receiver_id;
  ELSE
    smaller_id := request_record.receiver_id;
    larger_id := request_record.sender_id;
  END IF;
  
  -- Update friend request status
  UPDATE friend_requests 
  SET status = 'accepted', updated_at = NOW()
  WHERE id = request_id;
  
  -- Create friendship record
  INSERT INTO friendships (user1_id, user2_id)
  VALUES (smaller_id, larger_id)
  ON CONFLICT (user1_id, user2_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;