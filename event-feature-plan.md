# Event Feature Implementation Plan
*Following CLAUDE.md workflow: create migration → test locally → generate types → deploy*

## Problem Statement
Users need an Event feature for big trips that groups multiple Rooms (expense groups) so they can manage rooms and payment splits in one centralized place. When opening a Room from an Event, it must show the exact same UI as standalone Rooms.

## Requirements Analysis
- **Event Creation**: name, description, start_date, end_date, member invites
- **Room Grouping**: Events contain multiple Rooms, reusing existing expense group logic
- **Member Inheritance**: Event members auto-inherit to all Rooms in that Event
- **UI Reuse**: Room UI must be identical whether accessed standalone or from Event
- **Backward Compatibility**: All existing expense functionality must remain unchanged

## Data Model Design
### New Tables (Minimal Schema Changes)
```sql
events (id, name, description, start_date, end_date, created_by, created_at, updated_at)
event_members (id, event_id, user_id, role, joined_at)
```

### Existing Table Changes
```sql
expense_groups: ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL
```

## Implementation Todo List

### Phase 1: Database Foundation
- [ ] Create safe Supabase migration for Events schema
- [ ] Add RLS policies for Events and event_members
- [ ] Create database functions for Event CRUD operations
- [ ] Create member inheritance trigger functions
- [ ] Test migration locally with `supabase test db`
- [ ] Generate TypeScript types with `supabase gen types`

### Phase 2: Services Layer
- [ ] Create `services/events.ts` for Event operations
- [ ] Enhance existing `services/expenses.ts` to handle event_id (backward compatible)
- [ ] Create TypeScript types in `types/events.ts`
- [ ] Test all existing expense functionality still works

### Phase 3: UI Components
- [ ] Create `components/events/` directory structure
- [ ] Build `EventSidebar.tsx` for event info and actions
- [ ] Build `EventRoomList.tsx` for listing rooms in collapsed view
- [ ] Build `SlidingRoomPanel.tsx` for right-side panel
- [ ] Build `EventRoomView.tsx` that reuses exact same Room UI
- [ ] Create `CreateEventModal.tsx` for event creation

### Phase 4: Pages and Routing
- [ ] Create `app/events/page.tsx` for Events list
- [ ] Create `app/events/[eventId]/page.tsx` for Event details
- [ ] Create `components/EventPage.tsx` main event page component
- [ ] Update navigation to include Events link
- [ ] Add routing and breadcrumbs

### Phase 5: Integration and Testing
- [ ] Test Event creation with member inheritance
- [ ] Test Room UI parity between standalone and event contexts
- [ ] Verify all existing expense functionality unchanged
- [ ] Test member override functionality per-room
- [ ] Performance testing for sliding panels and lazy loading

### Phase 6: Production Deployment
- [ ] Deploy database migration to production
- [ ] Deploy backend services
- [ ] Deploy frontend with feature flag
- [ ] Gradual rollout to users
- [ ] Monitor for regressions

## Key Design Principles
1. **Simplicity**: Minimal changes, maximum reuse of existing components
2. **Backward Compatibility**: Zero impact on existing expense functionality
3. **UI Consistency**: Exact same Room UI in both contexts
4. **Safe Migration**: Additive-only database changes
5. **Testing First**: Test locally before any production changes

## Success Criteria
- [ ] 0% regression in existing expense functionality
- [ ] Event creation success rate >95%
- [ ] 100% UI consistency between standalone and event Room views
- [ ] Member inheritance works 100% accurately
- [ ] Page load performance impact <10%

## Architecture Decisions
- **Reuse Existing Components**: ExpenseCard, SettlementCard, CreateExpenseModal
- **Enhance Existing Services**: Add optional event_id to existing functions
- **Sliding Panel Pattern**: Right-side panel for Room details within Events
- **Member Inheritance**: Database triggers handle automatic member propagation
- **Feature Flag Strategy**: Gradual rollout with monitoring

## File Structure
```
components/
  events/
    EventPage.tsx           # Main event page wrapper
    EventSidebar.tsx        # Left sidebar with event info
    EventRoomList.tsx       # Center column room list
    SlidingRoomPanel.tsx    # Right sliding panel
    EventRoomView.tsx       # Room UI inside panel (reuses existing)
    CreateEventModal.tsx    # Event creation modal
  expenses/
    [existing files unchanged]
app/
  events/
    page.tsx               # Events list page
    [eventId]/
      page.tsx            # Event details page
services/
  events.ts               # New event service
  expenses.ts             # Enhanced with event support
types/
  events.ts               # Event-related TypeScript types
```

## Risk Mitigation
- **Database Migration Risk**: Use nullable foreign key, test extensively locally
- **UI Regression Risk**: Comprehensive testing of existing expense flows
- **Performance Risk**: Lazy loading, efficient queries, minimal re-renders
- **User Experience Risk**: Feature flag for gradual rollout

## Safe SQL Scripts to Run

### 1. Primary Migration Script
*Run this in Supabase SQL editor - safe and backward compatible*

```sql
-- Migration: add_event_system
-- Description: Add Event feature to group multiple Rooms (expense_groups)
-- Safe: All changes are additive, no existing data affected

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

-- Step 5: Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
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

CREATE POLICY "Users can view event members in their events" ON event_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_members em2 
            WHERE em2.event_id = event_members.event_id AND em2.user_id = auth.uid()
        )
    );

-- Step 7: Enable realtime (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE events;
-- ALTER PUBLICATION supabase_realtime ADD TABLE event_members;

-- Verify migration success
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
END $$;

COMMIT;
```

### 2. Database Functions Script
*Run this after the primary migration - adds helper functions*

```sql
-- Event Management Functions
-- Run after primary migration is successful

-- Function to create event with members
CREATE OR REPLACE FUNCTION create_event(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_member_ids UUID[] DEFAULT ARRAY[]::UUID[]
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_member_id UUID;
BEGIN
  -- Create the event
  INSERT INTO events (name, description, start_date, end_date, created_by)
  VALUES (p_name, p_description, p_start_date, p_end_date, auth.uid())
  RETURNING id INTO v_event_id;
  
  -- Add creator as owner
  INSERT INTO event_members (event_id, user_id, role)
  VALUES (v_event_id, auth.uid(), 'owner');
  
  -- Add invited members
  FOREACH v_member_id IN ARRAY p_member_ids LOOP
    INSERT INTO event_members (event_id, user_id, role)
    VALUES (v_event_id, v_member_id, 'member')
    ON CONFLICT (event_id, user_id) DO NOTHING;
  END LOOP;
  
  RETURN v_event_id;
END;
$$;

-- Function to get event details
CREATE OR REPLACE FUNCTION get_event_details(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'event', row_to_json(e.*),
    'members', (
      SELECT json_agg(
        json_build_object(
          'id', em.id,
          'user_id', em.user_id,
          'role', em.role,
          'user', json_build_object(
            'name', u.name,
            'profilePicture', u.profilePicture
          ),
          'joined_at', em.joined_at
        )
      )
      FROM event_members em
      JOIN users u ON u.id = em.user_id
      WHERE em.event_id = p_event_id
    ),
    'rooms', (
      SELECT json_agg(
        json_build_object(
          'group_id', eg.id,
          'group_name', eg.name,
          'description', eg.description,
          'total_amount', eg.total_amount,
          'status', eg.status,
          'created_at', eg.created_at
        )
      )
      FROM expense_groups eg
      WHERE eg.event_id = p_event_id
    )
  ) INTO v_result
  FROM events e
  WHERE e.id = p_event_id;
  
  RETURN v_result;
END;
$$;

-- Function to handle member inheritance (trigger function)
CREATE OR REPLACE FUNCTION handle_event_member_inheritance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a member is added to an event
  IF TG_OP = 'INSERT' THEN
    -- Add them to all existing rooms in the event (unless they're already there)
    INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
    SELECT 
      eg.id,
      NEW.user_id,
      0, -- Start with no debt
      0,
      false
    FROM expense_groups eg
    WHERE eg.event_id = NEW.event_id
    AND NOT EXISTS (
      SELECT 1 FROM expense_participants ep 
      WHERE ep.group_id = eg.id AND ep.user_id = NEW.user_id
    );
    
    RETURN NEW;
  END IF;
  
  -- When a member is removed from an event
  IF TG_OP = 'DELETE' THEN
    -- Only remove from rooms if they have no outstanding balances
    DELETE FROM expense_participants
    WHERE user_id = OLD.user_id
    AND group_id IN (SELECT id FROM expense_groups WHERE event_id = OLD.event_id)
    AND amount_owed = amount_paid -- Only if settled
    AND NOT EXISTS (
      -- Don't remove if there are pending settlements
      SELECT 1 FROM settlements s 
      WHERE s.group_id = expense_participants.group_id 
      AND (s.payer_id = OLD.user_id OR s.receiver_id = OLD.user_id)
      AND s.status = 'pending'
    );
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for automatic member inheritance
DROP TRIGGER IF EXISTS trigger_event_member_inheritance ON event_members;
CREATE TRIGGER trigger_event_member_inheritance
  AFTER INSERT OR DELETE ON event_members
  FOR EACH ROW
  EXECUTE FUNCTION handle_event_member_inheritance();

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Event management functions created successfully!';
    RAISE NOTICE 'Ready to create events and inherit members to rooms.';
END $$;
```

## Commands to Run

### Step 1: Apply Database Migration
1. Open Supabase SQL editor in your project dashboard
2. Copy and paste the **Primary Migration Script** from above
3. Click "Run" to execute
4. Verify success message appears

### Step 2: Add Helper Functions  
1. In Supabase SQL editor, copy and paste the **Database Functions Script**
2. Click "Run" to execute
3. Verify functions created successfully

### Step 3: Generate TypeScript Types (Local)
```bash
cd my-newv
npx supabase gen types typescript --local > types/database.ts
```

### Step 4: Test Migration Locally (Optional)
```bash
cd my-newv
npx supabase test db
```

## Safety Guarantees
✅ **Existing Data Safe**: All existing expense_groups will have `event_id = NULL`  
✅ **Backward Compatible**: All existing expense functionality continues unchanged  
✅ **Additive Only**: No existing columns or tables modified  
✅ **Rollback Safe**: Can remove event_id column if needed  
✅ **No Breaking Changes**: All current APIs continue working  

---

## Implementation Status
*This section will be updated as work progresses*

### Completed Tasks
- [x] Requirements analysis and architecture design
- [x] Project plan creation following CLAUDE.md workflow
- [x] Safe database migration scripts created

### In Progress
- [ ] Database migration execution

### Next Steps
1. Run database migration scripts in Supabase
2. Generate TypeScript types
3. Begin services layer implementation
4. Build core UI components

---

## Review Section
*Will be populated after implementation completion*

### Changes Made
*To be filled during implementation*

### Lessons Learned
*To be filled during implementation*

### Future Improvements
- Phase 2: Event-level expense aggregation
- Phase 3: Cross-room settlement features
- Phase 4: Event analytics and reporting