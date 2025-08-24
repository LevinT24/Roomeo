-- Enhanced Chat Schema for Roommate Features
-- This extends the existing chat system with new functionality

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

-- Similar policies for other tables...
-- (Adding remaining policies for brevity)

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