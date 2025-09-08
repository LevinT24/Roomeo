-- CREATE EVENT DATABASE FUNCTIONS
-- This migration creates the missing database functions that the Events service needs

-- ============================================================================
-- STEP 1: Drop existing functions to avoid parameter conflicts
-- ============================================================================

DROP FUNCTION IF EXISTS create_event CASCADE;
DROP FUNCTION IF EXISTS get_user_events CASCADE;
DROP FUNCTION IF EXISTS get_event_details CASCADE;
DROP FUNCTION IF EXISTS update_event CASCADE;
DROP FUNCTION IF EXISTS add_event_member CASCADE;
DROP FUNCTION IF EXISTS remove_event_member CASCADE;

-- ============================================================================
-- STEP 2: Create Event function
-- ============================================================================

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
  v_current_user UUID;
  v_member_id UUID;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate inputs
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Event name is required';
  END IF;

  -- Validate dates if provided
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    IF p_end_date < p_start_date THEN
      RAISE EXCEPTION 'End date cannot be before start date';
    END IF;
  END IF;

  -- Create the event
  INSERT INTO events (name, description, start_date, end_date, created_by)
  VALUES (trim(p_name), p_description, p_start_date, p_end_date, v_current_user)
  RETURNING id INTO v_event_id;

  -- Add creator as event owner
  INSERT INTO event_members (event_id, user_id, role)
  VALUES (v_event_id, v_current_user, 'owner');

  -- Add invited members
  IF p_member_ids IS NOT NULL AND array_length(p_member_ids, 1) > 0 THEN
    FOREACH v_member_id IN ARRAY p_member_ids
    LOOP
      -- Skip if trying to add creator again
      IF v_member_id != v_current_user THEN
        INSERT INTO event_members (event_id, user_id, role)
        VALUES (v_event_id, v_member_id, 'member')
        ON CONFLICT (event_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RAISE NOTICE 'Event created: ID=%, Name=%', v_event_id, p_name;
  RETURN v_event_id;
END;
$$;

-- ============================================================================
-- STEP 3: Get User Events function  
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_events(
  p_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID;
  v_result JSON;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Only allow users to get their own events
  IF p_user_id != v_current_user THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get events with aggregate data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'name', e.name,
      'description', e.description,
      'start_date', e.start_date,
      'end_date', e.end_date,
      'created_by', e.created_by,
      'created_by_name', u.name,
      'created_by_picture', u.profilepicture,
      'created_at', e.created_at,
      'updated_at', e.updated_at,
      'member_count', COALESCE(member_stats.member_count, 0),
      'rooms_count', COALESCE(room_stats.room_count, 0),
      'total_amount', COALESCE(room_stats.total_amount, 0),
      'user_role', em.role
    ) ORDER BY e.created_at DESC
  ) INTO v_result
  FROM events e
  JOIN event_members em ON e.id = em.event_id AND em.user_id = p_user_id
  LEFT JOIN users u ON e.created_by = u.id
  LEFT JOIN (
    SELECT 
      event_id,
      COUNT(user_id) as member_count
    FROM event_members 
    GROUP BY event_id
  ) member_stats ON e.id = member_stats.event_id
  LEFT JOIN (
    SELECT 
      event_id,
      COUNT(id) as room_count,
      SUM(total_amount) as total_amount
    FROM expense_groups 
    WHERE status = 'active'
    GROUP BY event_id
  ) room_stats ON e.id = room_stats.event_id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- ============================================================================
-- STEP 4: Get Event Details function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_event_details(
  p_event_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID;
  v_result JSON;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify user has access to this event
  IF NOT EXISTS (
    SELECT 1 FROM event_members 
    WHERE event_id = p_event_id AND user_id = v_current_user
  ) THEN
    RAISE EXCEPTION 'Access denied to event';
  END IF;

  -- Get event details with members and rooms
  SELECT jsonb_build_object(
    'event', jsonb_build_object(
      'id', e.id,
      'name', e.name,
      'description', e.description,
      'start_date', e.start_date,
      'end_date', e.end_date,
      'created_by', e.created_by,
      'created_by_name', creator.name,
      'created_by_picture', creator.profilepicture,
      'created_at', e.created_at,
      'updated_at', e.updated_at
    ),
    'members', COALESCE(members_data.members, '[]'::jsonb),
    'rooms', COALESCE(rooms_data.rooms, '[]'::jsonb),
    'stats', jsonb_build_object(
      'total_rooms', COALESCE(room_count.count, 0),
      'total_amount', COALESCE(room_total.amount, 0),
      'member_count', COALESCE(member_count.count, 0)
    )
  ) INTO v_result
  FROM events e
  LEFT JOIN users creator ON e.created_by = creator.id
  LEFT JOIN (
    SELECT 
      em.event_id,
      jsonb_agg(
        jsonb_build_object(
          'id', em.id,
          'user_id', em.user_id,
          'name', u.name,
          'profile_picture', u.profilepicture,
          'role', em.role,
          'joined_at', em.joined_at
        ) ORDER BY em.joined_at
      ) as members
    FROM event_members em
    LEFT JOIN users u ON em.user_id = u.id
    WHERE em.event_id = p_event_id
    GROUP BY em.event_id
  ) members_data ON e.id = members_data.event_id
  LEFT JOIN (
    SELECT 
      eg.event_id,
      jsonb_agg(
        jsonb_build_object(
          'group_id', eg.id,
          'group_name', eg.name,
          'description', eg.description,
          'total_amount', eg.total_amount,
          'status', eg.status,
          'created_by', eg.created_by,
          'created_at', eg.created_at
        ) ORDER BY eg.created_at DESC
      ) as rooms
    FROM expense_groups eg
    WHERE eg.event_id = p_event_id
    GROUP BY eg.event_id
  ) rooms_data ON e.id = rooms_data.event_id
  LEFT JOIN (
    SELECT event_id, COUNT(*) as count 
    FROM expense_groups 
    WHERE event_id = p_event_id AND status = 'active'
    GROUP BY event_id
  ) room_count ON e.id = room_count.event_id
  LEFT JOIN (
    SELECT event_id, SUM(total_amount) as amount 
    FROM expense_groups 
    WHERE event_id = p_event_id AND status = 'active'
    GROUP BY event_id
  ) room_total ON e.id = room_total.event_id
  LEFT JOIN (
    SELECT event_id, COUNT(*) as count 
    FROM event_members 
    WHERE event_id = p_event_id
    GROUP BY event_id
  ) member_count ON e.id = member_count.event_id
  WHERE e.id = p_event_id;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- STEP 5: Update Event function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_event(
  p_event_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify user is event owner
  IF NOT EXISTS (
    SELECT 1 FROM event_members 
    WHERE event_id = p_event_id AND user_id = v_current_user AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only event owners can update events';
  END IF;

  -- Validate dates if provided
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    IF p_end_date < p_start_date THEN
      RAISE EXCEPTION 'End date cannot be before start date';
    END IF;
  END IF;

  -- Update event (only update provided fields)
  UPDATE events SET
    name = COALESCE(NULLIF(trim(p_name), ''), name),
    description = COALESCE(p_description, description),
    start_date = COALESCE(p_start_date, start_date),
    end_date = COALESCE(p_end_date, end_date),
    updated_at = NOW()
  WHERE id = p_event_id;

  RETURN TRUE;
END;
$$;

-- ============================================================================
-- STEP 6: Add/Remove Event Members functions
-- ============================================================================

CREATE OR REPLACE FUNCTION add_event_member(
  p_event_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'member'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify user is event owner
  IF NOT EXISTS (
    SELECT 1 FROM event_members 
    WHERE event_id = p_event_id AND user_id = v_current_user AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only event owners can add members';
  END IF;

  -- Validate role
  IF p_role NOT IN ('member', 'owner') THEN
    RAISE EXCEPTION 'Invalid role. Must be "member" or "owner"';
  END IF;

  -- Add member
  INSERT INTO event_members (event_id, user_id, role)
  VALUES (p_event_id, p_user_id, p_role)
  ON CONFLICT (event_id, user_id) DO UPDATE SET
    role = EXCLUDED.role;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION remove_event_member(
  p_event_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user UUID;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify user is event owner or removing themselves
  IF NOT EXISTS (
    SELECT 1 FROM event_members 
    WHERE event_id = p_event_id AND user_id = v_current_user AND role = 'owner'
  ) AND p_user_id != v_current_user THEN
    RAISE EXCEPTION 'Only event owners can remove members, or users can remove themselves';
  END IF;

  -- Don't allow removing the event owner (unless they're removing themselves)
  IF EXISTS (
    SELECT 1 FROM event_members 
    WHERE event_id = p_event_id AND user_id = p_user_id AND role = 'owner'
  ) AND p_user_id != v_current_user THEN
    RAISE EXCEPTION 'Cannot remove event owner';
  END IF;

  -- Remove member
  DELETE FROM event_members 
  WHERE event_id = p_event_id AND user_id = p_user_id;

  RETURN TRUE;
END;
$$;

-- ============================================================================
-- STEP 7: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_events TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_details TO authenticated;
GRANT EXECUTE ON FUNCTION update_event TO authenticated;
GRANT EXECUTE ON FUNCTION add_event_member TO authenticated;
GRANT EXECUTE ON FUNCTION remove_event_member TO authenticated;

-- ============================================================================
-- STEP 8: Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION create_event IS 'Creates a new event and adds creator as owner';
COMMENT ON FUNCTION get_user_events IS 'Gets all events user is a member of with stats';
COMMENT ON FUNCTION get_event_details IS 'Gets detailed event info including members and rooms';
COMMENT ON FUNCTION update_event IS 'Updates event details (owner only)';
COMMENT ON FUNCTION add_event_member IS 'Adds member to event (owner only)';
COMMENT ON FUNCTION remove_event_member IS 'Removes member from event (owner only, or self)';

-- ============================================================================
-- STEP 9: Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'EVENT DATABASE FUNCTIONS CREATED SUCCESSFULLY';
  RAISE NOTICE 'Functions: create_event, get_user_events, get_event_details, update_event, add_event_member, remove_event_member';
  RAISE NOTICE '============================================================';
END
$$;