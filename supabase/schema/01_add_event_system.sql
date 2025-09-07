-- Migration: add_event_system
-- Description: Add Event feature to group multiple Rooms (expense_groups)
-- Safe: All changes are additive, no existing data affected
-- Date: 2025-01-01
-- Author: Claude Code Assistant

BEGIN;

-- Step 1: Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create event_members table
CREATE TABLE IF NOT EXISTS event_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Step 3: Add event_id to existing expense_groups table (SAFE - nullable)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expense_groups' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE expense_groups 
        ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_event_members_event_id ON event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_event_members_user_id ON event_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_groups_event_id ON expense_groups(event_id);

-- Step 5: Enable RLS (Row Level Security)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for events table
CREATE POLICY "Users can view events they're members of" ON events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_members em 
            WHERE em.event_id = events.id AND em.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create events" ON events
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Event owners can update events" ON events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM event_members em 
            WHERE em.event_id = events.id AND em.user_id = auth.uid() AND em.role = 'owner'
        )
    );

CREATE POLICY "Event owners can delete events" ON events
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM event_members em 
            WHERE em.event_id = events.id AND em.user_id = auth.uid() AND em.role = 'owner'
        )
    );

-- Step 7: Create RLS policies for event_members table
CREATE POLICY "Users can view event members in their events" ON event_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_members em2 
            WHERE em2.event_id = event_members.event_id AND em2.user_id = auth.uid()
        )
    );

CREATE POLICY "Event owners can add members" ON event_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_members em 
            WHERE em.event_id = event_members.event_id AND em.user_id = auth.uid() AND em.role = 'owner'
        )
    );

CREATE POLICY "Event owners can remove members" ON event_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM event_members em 
            WHERE em.event_id = event_members.event_id AND em.user_id = auth.uid() AND em.role = 'owner'
        )
    );

CREATE POLICY "Users can leave events themselves" ON event_members
    FOR DELETE USING (user_id = auth.uid() AND role = 'member');

-- Step 8: Enable realtime subscriptions (optional)
-- Uncomment these lines if you want real-time updates for events
-- ALTER PUBLICATION supabase_realtime ADD TABLE events;
-- ALTER PUBLICATION supabase_realtime ADD TABLE event_members;

-- Step 9: Add comments for documentation
COMMENT ON TABLE events IS 'Events group multiple expense rooms for big trips or shared activities';
COMMENT ON TABLE event_members IS 'Members of events with their roles (owner/member)';
COMMENT ON COLUMN expense_groups.event_id IS 'Optional reference to parent event (NULL for standalone rooms)';

COMMENT ON COLUMN events.name IS 'Display name of the event (e.g., "Vegas Trip 2025")';
COMMENT ON COLUMN events.description IS 'Optional description of the event';
COMMENT ON COLUMN events.start_date IS 'Optional start date of the event';
COMMENT ON COLUMN events.end_date IS 'Optional end date of the event';

COMMENT ON COLUMN event_members.role IS 'Role in event: "owner" (can manage event) or "member" (participant)';

-- Step 10: Verify migration success
DO $$
BEGIN
    -- Check that all tables exist
    ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'events') = 1,
           'events table not created';
    ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'event_members') = 1,
           'event_members table not created';
    
    -- Check that event_id column exists in expense_groups
    ASSERT (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'expense_groups' AND column_name = 'event_id') = 1,
           'event_id column not added to expense_groups';
           
    -- Ensure all existing expense_groups have NULL event_id (which they should)
    ASSERT (SELECT COUNT(*) FROM expense_groups WHERE event_id IS NOT NULL) = 0,
           'existing expense_groups should have NULL event_id';
    
    RAISE NOTICE 'Event system migration completed successfully!';
    RAISE NOTICE 'All existing expense groups remain unchanged.';
    RAISE NOTICE 'Ready to create events and group rooms together.';
END $$;

COMMIT;