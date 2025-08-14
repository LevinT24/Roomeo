-- Migration: Add real-time chat features
-- Date: 2025-08-14
-- Description: Adds necessary columns and indexes for WhatsApp-like chat functionality

-- Add columns to messages table for status tracking and optimistic updates
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT true, -- Set default to true for existing messages
ADD COLUMN IF NOT EXISTS client_id UUID DEFAULT NULL, -- For optimistic updates and deduplication
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image')),
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS image_thumbnail_url TEXT DEFAULT NULL;

-- Add columns to chats table for better chat management
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_message_preview TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for better performance on message queries with status
CREATE INDEX IF NOT EXISTS idx_messages_chat_created_desc 
ON messages (chat_id, created_at DESC);

-- Create index for message status queries
CREATE INDEX IF NOT EXISTS idx_messages_status 
ON messages (chat_id, is_delivered, is_read);

-- Create index for client_id for deduplication
CREATE INDEX IF NOT EXISTS idx_messages_client_id 
ON messages (client_id) WHERE client_id IS NOT NULL;

-- Create index for chats ordered by last activity
CREATE INDEX IF NOT EXISTS idx_chats_last_activity 
ON chats (last_message_at DESC NULLS LAST);

-- Update existing messages to have proper read status
-- Mark messages as read if they're not from the current chat participants
UPDATE messages 
SET is_read = true, is_delivered = true 
WHERE created_at < NOW() - INTERVAL '1 hour';

-- Function to automatically update chat metadata when messages are inserted
CREATE OR REPLACE FUNCTION update_chat_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the chat's last message info
    UPDATE chats 
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = CASE 
            WHEN NEW.message_type = 'image' THEN '📷 Image'
            ELSE LEFT(NEW.content, 50) 
        END,
        updated_at = NEW.created_at
    WHERE id = NEW.chat_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic chat metadata updates
DROP TRIGGER IF EXISTS trigger_update_chat_metadata ON messages;
CREATE TRIGGER trigger_update_chat_metadata
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_metadata();

-- Function to mark messages as delivered when a user comes online
CREATE OR REPLACE FUNCTION mark_messages_delivered(p_chat_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE messages 
    SET is_delivered = true
    WHERE chat_id = p_chat_id 
    AND sender_id != p_user_id 
    AND is_delivered = false;
END;
$$ LANGUAGE plpgsql;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_chat_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE messages 
    SET is_read = true
    WHERE chat_id = p_chat_id 
    AND sender_id != p_user_id 
    AND is_read = false;
END;
$$ LANGUAGE plpgsql;

-- Create a table for typing indicators (optional - can also use real-time channels)
CREATE TABLE IF NOT EXISTS typing_indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT false,
    last_typed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint for typing indicators
CREATE UNIQUE INDEX IF NOT EXISTS idx_typing_indicators_unique 
ON typing_indicators (chat_id, user_id);

-- Auto-cleanup old typing indicators
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS void AS $$
BEGIN
    DELETE FROM typing_indicators 
    WHERE last_typed_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Create storage bucket for chat images if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-images',
    'chat-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the new columns and features
-- Enable RLS on typing_indicators if not already enabled
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Policy for typing indicators - users can only see/modify their own and their chat partners'
CREATE POLICY IF NOT EXISTS "Users can manage typing indicators in their chats" ON typing_indicators
FOR ALL USING (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM chats c 
        WHERE c.id = typing_indicators.chat_id 
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
);

-- Update RLS policies for messages to include new columns
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
CREATE POLICY "Users can view messages in their chats" ON messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM chats c 
        WHERE c.id = messages.chat_id 
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can insert messages in their chats" ON messages;
CREATE POLICY "Users can insert messages in their chats" ON messages
FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM chats c 
        WHERE c.id = messages.chat_id 
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can update message status" ON messages;
CREATE POLICY "Users can update message status" ON messages
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM chats c 
        WHERE c.id = messages.chat_id 
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
);

-- Storage policies for chat images
CREATE POLICY IF NOT EXISTS "Users can upload chat images" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'chat-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can view chat images" ON storage.objects
FOR SELECT USING (
    bucket_id = 'chat-images' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        -- Allow viewing if user is part of a chat where this image was shared
        EXISTS (
            SELECT 1 FROM messages m
            JOIN chats c ON c.id = m.chat_id
            WHERE m.image_url LIKE '%' || name || '%'
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    )
);

-- Add helpful comments
COMMENT ON COLUMN messages.is_delivered IS 'Whether the message has been delivered to the recipient';
COMMENT ON COLUMN messages.is_read IS 'Whether the message has been read by the recipient';
COMMENT ON COLUMN messages.client_id IS 'Client-generated ID for optimistic updates and deduplication';
COMMENT ON COLUMN messages.message_type IS 'Type of message: text or image';
COMMENT ON COLUMN messages.image_url IS 'URL of the image if message_type is image';
COMMENT ON COLUMN chats.last_message_at IS 'Timestamp of the last message in this chat';
COMMENT ON COLUMN chats.last_message_preview IS 'Preview text of the last message';

-- Commit the transaction
COMMIT;