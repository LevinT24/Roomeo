-- CREATE EVENTS TABLES - ESSENTIAL FOUNDATION
-- This migration creates the core Events system tables that are required for the Event feature

-- ============================================================================
-- STEP 1: Create Events table
-- ============================================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  total_budget DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create Event Members table
-- ============================================================================

CREATE TABLE event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ============================================================================
-- STEP 3: Add event_id column to expense_groups (if not exists)
-- ============================================================================

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

-- ============================================================================
-- STEP 4: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_members_event_id ON event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_event_members_user_id ON event_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_groups_event_id ON expense_groups(event_id);

-- ============================================================================
-- STEP 5: Enable RLS policies
-- ============================================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;

-- Events: Users can see events they are members of
CREATE POLICY "Users can view events they are members of"
  ON events FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM event_members WHERE event_id = events.id
    )
  );

-- Events: Users can insert events (they become creator)
CREATE POLICY "Users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Events: Creators can update their events
CREATE POLICY "Event creators can update their events"
  ON events FOR UPDATE
  USING (auth.uid() = created_by);

-- Event Members: Users can see members of events they belong to
CREATE POLICY "Users can view members of their events"
  ON event_members FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM event_members em2 WHERE em2.event_id = event_members.event_id
    )
  );

-- Event Members: Event creators can manage members
CREATE POLICY "Event creators can manage members"
  ON event_members FOR ALL
  USING (
    auth.uid() IN (
      SELECT created_by FROM events WHERE id = event_members.event_id
    )
  );

-- Event Members: Users can join events (insert themselves)
CREATE POLICY "Users can join events"
  ON event_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: Grant permissions
-- ============================================================================

GRANT ALL ON events TO authenticated;
GRANT ALL ON event_members TO authenticated;

-- ============================================================================
-- STEP 7: Add helpful comments
-- ============================================================================

COMMENT ON TABLE events IS 'Events table for organizing multiple expense rooms for trips/gatherings';
COMMENT ON TABLE event_members IS 'Members/participants of events';
COMMENT ON COLUMN expense_groups.event_id IS 'Links expense rooms to events for organization';

-- ============================================================================
-- STEP 8: Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'EVENTS TABLES CREATED SUCCESSFULLY';
  RAISE NOTICE 'Tables: events, event_members';
  RAISE NOTICE 'Added event_id column to expense_groups';
  RAISE NOTICE '============================================================';
END
$$;