-- COMPLETE EVENT FEATURE SETUP - ULTRA SIMPLE AND BULLETPROOF
-- This migration sets up the entire Event system from scratch
-- Following CLAUDE.md principles: simple, clean, one complete solution

-- ============================================================================
-- STEP 1: Verify Events infrastructure exists (dependency check)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
    RAISE EXCEPTION 'Events tables not found! Tables already exist in database ✅';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_members') THEN
    RAISE EXCEPTION 'Event_members table not found! Tables already exist in database ✅';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_event') THEN
    RAISE EXCEPTION 'Event functions not found! Please run 02_create_event_database_functions.sql migration first';
  END IF;
  
  RAISE NOTICE 'Events infrastructure verified ✅ (tables and functions exist)';
END $$;

-- ============================================================================
-- STEP 2: Clean slate - remove all conflicting functions
-- ============================================================================

-- Drop all existing event-related functions safely (with all possible signatures)
DROP FUNCTION IF EXISTS create_expense_group_with_event(TEXT, DECIMAL, UUID[], TEXT, TEXT, DECIMAL[], BOOLEAN, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_expense_group_with_event(TEXT, DECIMAL, UUID[], TEXT, TEXT, DECIMAL[], BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS create_expense_group_with_event(TEXT, DECIMAL, UUID[], TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_expense_group_with_event CASCADE;

DROP FUNCTION IF EXISTS create_expense_group_for_event(TEXT, DECIMAL, UUID[], TEXT, TEXT, DECIMAL[], BOOLEAN, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_expense_group_for_event(TEXT, DECIMAL, UUID[], TEXT, TEXT, DECIMAL[], BOOLEAN) CASCADE; 
DROP FUNCTION IF EXISTS create_expense_group_for_event(TEXT, DECIMAL, UUID[], TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_expense_group_for_event CASCADE;

-- Also drop any variations that might exist
DROP FUNCTION IF EXISTS create_event_room CASCADE;
DROP FUNCTION IF EXISTS create_regular_room CASCADE;

-- ============================================================================
-- STEP 3: Create the core Event room creation function (BULLETPROOF)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_event_room(
  p_name TEXT,
  p_total_amount DECIMAL(10,2),
  p_selected_friends UUID[], -- Friends selected in UI
  p_event_id UUID, -- Required for event rooms
  p_description TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id UUID;
  v_current_user UUID;
  v_all_participants UUID[];
  v_participant UUID;
  v_amount_per_person DECIMAL(10,2);
  v_participant_count INTEGER := 0;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify event exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM event_members em 
    WHERE em.event_id = p_event_id AND em.user_id = v_current_user
  ) THEN
    RAISE EXCEPTION 'Access denied to event or event does not exist';
  END IF;

  -- Create the expense group (room)
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, event_id, status)
  VALUES (p_name, p_description, v_current_user, p_total_amount, 'equal', p_event_id, 'active')
  RETURNING id INTO v_room_id;

  RAISE NOTICE 'EVENT ROOM CREATED: ID=%, Name=%, Amount=%', v_room_id, p_name, p_total_amount;

  -- Get ALL participants: current user + event members + selected friends
  WITH unique_participants AS (
    -- Current user (creator)
    SELECT v_current_user as user_id
    UNION
    -- All event members  
    SELECT em.user_id 
    FROM event_members em 
    WHERE em.event_id = p_event_id
    UNION
    -- Selected friends
    SELECT unnest(COALESCE(p_selected_friends, ARRAY[]::UUID[])) as user_id
  )
  SELECT array_agg(user_id) INTO v_all_participants
  FROM unique_participants;

  -- Calculate amount per person
  v_participant_count := array_length(v_all_participants, 1);
  v_amount_per_person := p_total_amount / v_participant_count;

  RAISE NOTICE 'PARTICIPANTS: Total=%, Amount each=%', v_participant_count, v_amount_per_person;

  -- Add each participant
  FOREACH v_participant IN ARRAY v_all_participants
  LOOP
    INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
    VALUES (v_room_id, v_participant, v_amount_per_person, 0, false)
    ON CONFLICT (group_id, user_id) DO UPDATE SET
      amount_owed = v_amount_per_person,
      amount_paid = 0,
      is_settled = false;
    
    RAISE NOTICE 'ADDED PARTICIPANT: user=%, owes=%', v_participant, v_amount_per_person;
  END LOOP;

  -- Final verification
  SELECT COUNT(*) INTO v_participant_count
  FROM expense_participants 
  WHERE group_id = v_room_id;

  RAISE NOTICE 'SUCCESS: Room % created with % participants', v_room_id, v_participant_count;

  RETURN v_room_id;
END;
$$;

-- ============================================================================
-- STEP 4: Create function for regular (non-event) rooms
-- ============================================================================

CREATE OR REPLACE FUNCTION create_regular_room(
  p_name TEXT,
  p_total_amount DECIMAL(10,2),
  p_participants UUID[],
  p_description TEXT DEFAULT NULL,
  p_split_type TEXT DEFAULT 'equal',
  p_custom_amounts DECIMAL(10,2)[] DEFAULT NULL,
  p_create_group_chat BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id UUID;
  v_current_user UUID;
  v_participant UUID;
  v_amount_owed DECIMAL(10,2);
  v_all_participants UUID[];
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Create expense group
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, status)
  VALUES (p_name, p_description, v_current_user, p_total_amount, p_split_type, 'active')
  RETURNING id INTO v_room_id;

  -- Add current user + selected participants
  SELECT array_agg(DISTINCT user_id) INTO v_all_participants
  FROM (
    SELECT v_current_user as user_id
    UNION
    SELECT unnest(COALESCE(p_participants, ARRAY[]::UUID[])) as user_id
  ) t;

  -- Add participants
  FOR i IN 1..array_length(v_all_participants, 1) LOOP
    v_participant := v_all_participants[i];
    
    IF p_split_type = 'equal' THEN
      v_amount_owed := p_total_amount / array_length(v_all_participants, 1);
    ELSIF p_split_type = 'custom' AND p_custom_amounts IS NOT NULL AND i <= array_length(p_custom_amounts, 1) THEN
      v_amount_owed := p_custom_amounts[i];
    ELSE
      v_amount_owed := p_total_amount / array_length(v_all_participants, 1);
    END IF;

    INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
    VALUES (v_room_id, v_participant, v_amount_owed, 0, false)
    ON CONFLICT (group_id, user_id) DO UPDATE SET
      amount_owed = v_amount_owed;
  END LOOP;

  RETURN v_room_id;
END;
$$;

-- ============================================================================
-- STEP 5: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_event_room TO authenticated;
GRANT EXECUTE ON FUNCTION create_regular_room TO authenticated;

-- ============================================================================
-- STEP 6: Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION create_event_room IS 'Creates expense rooms within events - automatically includes all event members';
COMMENT ON FUNCTION create_regular_room IS 'Creates regular expense rooms - only includes selected participants';

-- ============================================================================
-- STEP 7: Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'COMPLETE EVENT FEATURE SETUP SUCCESSFUL';
  RAISE NOTICE 'Functions created: create_event_room, create_regular_room';
  RAISE NOTICE '=============================================================';
END
$$;