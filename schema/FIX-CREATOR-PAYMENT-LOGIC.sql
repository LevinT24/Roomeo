  -- ===============================
  -- FIX CREATOR PAYMENT LOGIC
  -- Creators should not pay themselves - they collect money from participants
  -- This fixes the core issue where creators were being added as participants who owe money
  -- ===============================

  -- Migration: Fix creator payment logic
  -- Issue: create_event_room and create_regular_room functions incorrectly add creators as participants
  -- Solution: Exclude creators from expense_participants table - they are collectors, not payers

  -- Drop existing functions safely
  DROP FUNCTION IF EXISTS create_event_room CASCADE;
  DROP FUNCTION IF EXISTS create_regular_room CASCADE;

  -- ===============================
  -- 1. CREATE EVENT ROOM (FIXED)
  -- ===============================
  -- Creates expense rooms within events - includes event members EXCEPT creator
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
    -- Get current user (creator)
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
    -- Creator is the owner but NOT a participant who owes money
    INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, event_id, status)
    VALUES (p_name, p_description, v_current_user, p_total_amount, 'equal', p_event_id, 'active')
    RETURNING id INTO v_room_id;

    RAISE NOTICE 'EVENT ROOM CREATED: ID=%, Name=%, Amount=%', v_room_id, p_name, p_total_amount;

    -- Get ONLY participants who will owe money (EXCLUDING creator)
    WITH unique_participants AS (
      -- All event members EXCEPT creator
      SELECT em.user_id 
      FROM event_members em 
      WHERE em.event_id = p_event_id 
        AND em.user_id != v_current_user  -- CRITICAL: EXCLUDE CREATOR
      UNION
      -- Additional selected friends (if any)
      SELECT unnest(COALESCE(p_selected_friends, ARRAY[]::UUID[])) as user_id
      WHERE unnest(COALESCE(p_selected_friends, ARRAY[]::UUID[])) != v_current_user  -- CRITICAL: EXCLUDE CREATOR
    )
    SELECT array_agg(user_id) INTO v_all_participants
    FROM unique_participants;

    -- Calculate amount per person (split only among participants, not creator)
    v_participant_count := array_length(v_all_participants, 1);
    
    -- Handle edge case: no participants
    IF v_participant_count = 0 THEN
      RAISE EXCEPTION 'No participants found for expense room - creator cannot be the only participant';
    END IF;
    
    v_amount_per_person := p_total_amount / v_participant_count;

    RAISE NOTICE 'PARTICIPANTS: Total=%, Amount each=% (Creator excluded)', v_participant_count, v_amount_per_person;

    -- Add each participant to expense_participants table
    -- IMPORTANT: Creator is NOT added here - they don't owe money
    FOREACH v_participant IN ARRAY v_all_participants
    LOOP
      INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
      VALUES (v_room_id, v_participant, v_amount_per_person, 0, false)
      ON CONFLICT (group_id, user_id) DO UPDATE SET
        amount_owed = v_amount_per_person,
        amount_paid = 0,
        is_settled = false;
    END LOOP;

    RETURN v_room_id;
  END
  $$;

  -- ===============================
  -- 2. CREATE REGULAR ROOM (FIXED)  
  -- ===============================
  -- Creates regular expense rooms - includes selected participants EXCEPT creator
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
    v_participants_only UUID[];
  BEGIN
    -- Get current user (creator)
    v_current_user := auth.uid();
    IF v_current_user IS NULL THEN
      RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Create expense group
    -- Creator is the owner but NOT a participant who owes money
    INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, status)
    VALUES (p_name, p_description, v_current_user, p_total_amount, p_split_type, 'active')
    RETURNING id INTO v_room_id;

    -- Get ONLY selected participants who will owe money (EXCLUDING creator)
    SELECT array_agg(user_id) INTO v_participants_only
    FROM (
      SELECT unnest(COALESCE(p_participants, ARRAY[]::UUID[])) as user_id
      WHERE unnest(COALESCE(p_participants, ARRAY[]::UUID[])) != v_current_user  -- CRITICAL: EXCLUDE CREATOR
    ) t;

    -- Handle edge case: no participants
    IF v_participants_only IS NULL OR array_length(v_participants_only, 1) = 0 THEN
      RAISE EXCEPTION 'No participants found for expense room - creator cannot be the only participant';
    END IF;

    RAISE NOTICE 'REGULAR ROOM: Participants=%, Creator excluded', array_length(v_participants_only, 1);

    -- Add participants to expense_participants table
    -- IMPORTANT: Creator is NOT added here - they don't owe money
    FOR i IN 1..array_length(v_participants_only, 1) LOOP
      v_participant := v_participants_only[i];
      
      -- Calculate amount owed by this participant
      IF p_split_type = 'equal' THEN
        v_amount_owed := p_total_amount / array_length(v_participants_only, 1);
      ELSIF p_split_type = 'custom' AND p_custom_amounts IS NOT NULL THEN
        v_amount_owed := p_custom_amounts[i];
      ELSE
        RAISE EXCEPTION 'Invalid split configuration';
      END IF;
      
      -- Insert participant (NOT creator)
      INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
      VALUES (v_room_id, v_participant, v_amount_owed, 0, false);
    END LOOP;

    RETURN v_room_id;
  END
  $$;

  -- ===============================
  -- 3. GRANT PERMISSIONS
  -- ===============================
  GRANT EXECUTE ON FUNCTION create_event_room TO authenticated;
  GRANT EXECUTE ON FUNCTION create_regular_room TO authenticated;

  -- ===============================
  -- 4. ADD DOCUMENTATION
  -- ===============================
  COMMENT ON FUNCTION create_event_room IS 'Creates expense rooms within events. Creator collects money from event members (excluding creator themselves).';
  COMMENT ON FUNCTION create_regular_room IS 'Creates regular expense rooms. Creator collects money from selected participants (excluding creator themselves).';

  -- ===============================
  -- 5. VERIFICATION NOTES
  -- ===============================
  -- After running this migration:
  -- 1. Creators will NOT appear in expense_participants table
  -- 2. Only selected friends/members will owe money
  -- 3. Creators collect money (they don't pay themselves)
  -- 4. Frontend logic already handles this correctly
  -- 5. Existing expense rooms are NOT affected (only new ones)

  -- ===============================
  -- MIGRATION COMPLETE
  -- ===============================