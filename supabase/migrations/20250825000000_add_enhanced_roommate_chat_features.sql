-- Enhanced Roommate Chat Features Migration
-- Date: 2025-08-25
-- Description: Adds comprehensive roommate chat features including reactions, polls, chores, expenses, bills, and more

-- Message Reactions Table
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Pinned Messages Table
CREATE TABLE IF NOT EXISTS pinned_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    pinned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pinned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chat_id, message_id)
);

-- File Attachments Table
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Polls Table
CREATE TABLE IF NOT EXISTS chat_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of options with vote counts
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE,
    multiple_choice BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Poll Votes Table
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES chat_polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(poll_id, user_id, option_index) -- Allows multiple votes if multiple_choice is true
);

-- Chore Assignments Table
CREATE TABLE IF NOT EXISTS chore_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    chore_name VARCHAR(255) NOT NULL,
    assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, overdue
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense Splits Table (extends existing expense functionality)
CREATE TABLE IF NOT EXISTS chat_expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'proposed', -- proposed, accepted, rejected, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bill Reminders Table
CREATE TABLE IF NOT EXISTS bill_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2),
    due_date DATE NOT NULL,
    reminder_frequency VARCHAR(50) DEFAULT 'weekly', -- daily, weekly, monthly
    last_reminded TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Mentions Table
CREATE TABLE IF NOT EXISTS message_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentioned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, mentioned_user_id)
);

-- Enhanced Messages Table - Add new columns
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_chat_id ON pinned_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_polls_chat_id ON chat_polls(chat_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_chat_id ON chore_assignments(chat_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_assigned_to ON chore_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chat_expense_splits_chat_id ON chat_expense_splits(chat_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_chat_id ON bill_reminders(chat_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_due_date ON bill_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_message_mentions_mentioned_user_id ON message_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);

-- Enable RLS (Row Level Security)
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Message Reactions - Users can only see/modify reactions in chats they participate in
CREATE POLICY "Users can view reactions in their chats" ON message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN chats c ON m.chat_id = c.id
            WHERE m.id = message_reactions.message_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can add reactions in their chats" ON message_reactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM messages m
            JOIN chats c ON m.chat_id = c.id
            WHERE m.id = message_reactions.message_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can delete their own reactions" ON message_reactions
    FOR DELETE USING (user_id = auth.uid());

-- Pinned Messages - Users can only see/pin messages in their chats
CREATE POLICY "Users can view pinned messages in their chats" ON pinned_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = pinned_messages.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can pin messages in their chats" ON pinned_messages
    FOR INSERT WITH CHECK (
        pinned_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = pinned_messages.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can unpin messages they pinned" ON pinned_messages
    FOR DELETE USING (pinned_by = auth.uid());

-- Message Attachments - Users can only see attachments in their chats
CREATE POLICY "Users can view attachments in their chats" ON message_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN chats c ON m.chat_id = c.id
            WHERE m.id = message_attachments.message_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can upload attachments in their chats" ON message_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM messages m
            JOIN chats c ON m.chat_id = c.id
            WHERE m.id = message_attachments.message_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

-- Chat Polls
CREATE POLICY "Users can view polls in their chats" ON chat_polls
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = chat_polls.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can create polls in their chats" ON chat_polls
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = chat_polls.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

-- Poll Votes
CREATE POLICY "Users can view votes in their chats" ON poll_votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_polls cp
            JOIN chats c ON cp.chat_id = c.id
            WHERE cp.id = poll_votes.poll_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can vote in their chats" ON poll_votes
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chat_polls cp
            JOIN chats c ON cp.chat_id = c.id
            WHERE cp.id = poll_votes.poll_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

-- Chore Assignments
CREATE POLICY "Users can view chores in their chats" ON chore_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = chore_assignments.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can assign chores in their chats" ON chore_assignments
    FOR INSERT WITH CHECK (
        assigned_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = chore_assignments.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can update chore status" ON chore_assignments
    FOR UPDATE USING (
        (assigned_to = auth.uid() OR assigned_by = auth.uid()) AND
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = chore_assignments.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

-- Chat Expense Splits
CREATE POLICY "Users can view expense splits in their chats" ON chat_expense_splits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = chat_expense_splits.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can create expense splits in their chats" ON chat_expense_splits
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = chat_expense_splits.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

-- Bill Reminders
CREATE POLICY "Users can view bill reminders in their chats" ON bill_reminders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = bill_reminders.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can create bill reminders in their chats" ON bill_reminders
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = bill_reminders.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their bill reminders" ON bill_reminders
    FOR UPDATE USING (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = bill_reminders.chat_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

-- Message Mentions
CREATE POLICY "Users can view mentions in their chats" ON message_mentions
    FOR SELECT USING (
        mentioned_user_id = auth.uid() OR 
        mentioned_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM messages m
            JOIN chats c ON m.chat_id = c.id
            WHERE m.id = message_mentions.message_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can create mentions in their chats" ON message_mentions
    FOR INSERT WITH CHECK (
        mentioned_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM messages m
            JOIN chats c ON m.chat_id = c.id
            WHERE m.id = message_mentions.message_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their mention read status" ON message_mentions
    FOR UPDATE USING (mentioned_user_id = auth.uid());

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE pinned_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE chore_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE bill_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE message_mentions;

-- Create storage buckets for chat files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-attachments',
    'chat-attachments',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat attachments
CREATE POLICY "Users can upload chat attachments" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'chat-attachments' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view chat attachments" ON storage.objects
FOR SELECT USING (
    bucket_id = 'chat-attachments' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        -- Allow viewing if user is part of a chat where this file was shared
        EXISTS (
            SELECT 1 FROM message_attachments ma
            JOIN messages m ON m.id = ma.message_id
            JOIN chats c ON c.id = m.chat_id
            WHERE ma.file_url LIKE '%' || name || '%'
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    )
);

-- Utility Functions

-- Function to get chat participants
CREATE OR REPLACE FUNCTION get_chat_participants(p_chat_id UUID)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    profilepicture TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.name,
        u.profilepicture
    FROM chats c
    JOIN users u ON u.id IN (c.user1_id, c.user2_id)
    WHERE c.id = p_chat_id;
END;
$$ LANGUAGE plpgsql;

-- Function to detect expense in message
CREATE OR REPLACE FUNCTION detect_expense_in_message(p_content TEXT)
RETURNS TABLE (
    description TEXT,
    amount DECIMAL(10,2),
    confidence FLOAT
) AS $$
DECLARE
    expense_patterns TEXT[] := ARRAY[
        '\$([0-9]+\.?[0-9]*)',
        '([0-9]+\.?[0-9]*) dollars?',
        '([0-9]+\.?[0-9]*) bucks?'
    ];
    description_keywords TEXT[] := ARRAY[
        'pizza', 'food', 'groceries', 'rent', 'utilities', 'gas', 'electric',
        'internet', 'wifi', 'dinner', 'lunch', 'coffee', 'uber', 'taxi'
    ];
    detected_amount DECIMAL(10,2);
    detected_desc TEXT;
    conf FLOAT := 0.0;
    pattern TEXT;
    keyword TEXT;
BEGIN
    -- Extract amount using regex patterns
    FOREACH pattern IN ARRAY expense_patterns LOOP
        SELECT 
            CAST(regexp_replace(p_content, pattern, '\1', 'gi') AS DECIMAL(10,2))
        INTO detected_amount
        WHERE p_content ~* pattern
        LIMIT 1;
        
        IF detected_amount IS NOT NULL THEN
            conf := conf + 0.3;
            EXIT;
        END IF;
    END LOOP;
    
    -- Extract description keywords
    FOREACH keyword IN ARRAY description_keywords LOOP
        IF p_content ILIKE '%' || keyword || '%' THEN
            detected_desc := COALESCE(detected_desc || ', ', '') || keyword;
            conf := conf + 0.1;
        END IF;
    END LOOP;
    
    -- Return result if confidence is high enough
    IF conf >= 0.3 AND detected_amount > 0 THEN
        RETURN QUERY SELECT 
            COALESCE(detected_desc, 'Expense') as description,
            detected_amount as amount,
            LEAST(conf, 1.0) as confidence;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to detect chore in message
CREATE OR REPLACE FUNCTION detect_chore_in_message(p_content TEXT, p_chat_id UUID)
RETURNS TABLE (
    chore_name TEXT,
    assigned_to UUID,
    confidence FLOAT
) AS $$
DECLARE
    chore_keywords TEXT[] := ARRAY[
        'dishes', 'trash', 'garbage', 'vacuum', 'clean', 'laundry', 
        'bathroom', 'kitchen', 'sweep', 'mop', 'grocery', 'shopping'
    ];
    assignment_patterns TEXT[] := ARRAY[
        '→\s*(\w+)',
        'assign\s+to\s+(\w+)',
        '(\w+)\s+should',
        '(\w+)\s+can\s+you'
    ];
    detected_chore TEXT;
    detected_user UUID;
    conf FLOAT := 0.0;
    keyword TEXT;
    pattern TEXT;
    username TEXT;
BEGIN
    -- Extract chore keywords
    FOREACH keyword IN ARRAY chore_keywords LOOP
        IF p_content ILIKE '%' || keyword || '%' THEN
            detected_chore := COALESCE(detected_chore || ', ', '') || keyword;
            conf := conf + 0.2;
        END IF;
    END LOOP;
    
    -- Extract assignment patterns
    FOREACH pattern IN ARRAY assignment_patterns LOOP
        SELECT regexp_replace(p_content, pattern, '\1', 'gi')
        INTO username
        WHERE p_content ~* pattern
        LIMIT 1;
        
        IF username IS NOT NULL THEN
            -- Try to find user by name in chat participants
            SELECT u.id INTO detected_user
            FROM get_chat_participants(p_chat_id) u
            WHERE u.name ILIKE '%' || username || '%'
            LIMIT 1;
            
            IF detected_user IS NOT NULL THEN
                conf := conf + 0.4;
                EXIT;
            END IF;
        END IF;
    END LOOP;
    
    -- Return result if confidence is high enough
    IF conf >= 0.4 AND detected_chore IS NOT NULL THEN
        RETURN QUERY SELECT 
            detected_chore as chore_name,
            detected_user as assigned_to,
            LEAST(conf, 1.0) as confidence;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to check overdue chores and bill reminders
CREATE OR REPLACE FUNCTION check_overdue_items()
RETURNS void AS $$
BEGIN
    -- Update overdue chores
    UPDATE chore_assignments 
    SET status = 'overdue'
    WHERE status = 'pending' 
    AND due_date < CURRENT_DATE;
    
    -- Update bill reminder last_reminded for items due soon
    UPDATE bill_reminders
    SET last_reminded = NOW()
    WHERE is_active = true
    AND due_date <= CURRENT_DATE + INTERVAL '3 days'
    AND (last_reminded IS NULL OR last_reminded < NOW() - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE message_reactions IS 'Stores emoji reactions on chat messages';
COMMENT ON TABLE pinned_messages IS 'Tracks pinned messages in chats for important information';
COMMENT ON TABLE message_attachments IS 'File and image attachments linked to messages';
COMMENT ON TABLE chat_polls IS 'Polls created within chats for group decision making';
COMMENT ON TABLE poll_votes IS 'Individual votes cast on chat polls';
COMMENT ON TABLE chore_assignments IS 'Chore assignments and tracking within roommate chats';
COMMENT ON TABLE chat_expense_splits IS 'Expense splitting proposals and tracking';
COMMENT ON TABLE bill_reminders IS 'Recurring bill reminders for roommate groups';
COMMENT ON TABLE message_mentions IS 'User mentions within messages (@username)';

COMMENT ON FUNCTION detect_expense_in_message(TEXT) IS 'Detects expense amounts and descriptions in message content';
COMMENT ON FUNCTION detect_chore_in_message(TEXT, UUID) IS 'Detects chore assignments in message content';
COMMENT ON FUNCTION check_overdue_items() IS 'Updates status of overdue chores and bill reminders';