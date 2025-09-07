-- Event Management Functions
-- Description: Core functions for Event CRUD operations and member management
-- Dependencies: Requires 01_add_event_system.sql to be run first
-- Date: 2025-01-01
-- Author: Claude Code Assistant

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
  -- Validate input
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Event name cannot be empty';
  END IF;
  
  -- Validate dates if provided
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    IF p_end_date < p_start_date THEN
      RAISE EXCEPTION 'End date cannot be before start date';
    END IF;
  END IF;

  -- Create the event
  INSERT INTO events (name, description, start_date, end_date, created_by)
  VALUES (trim(p_name), p_description, p_start_date, p_end_date, auth.uid())
  RETURNING id INTO v_event_id;
  
  -- Add creator as owner
  INSERT INTO event_members (event_id, user_id, role)
  VALUES (v_event_id, auth.uid(), 'owner');
  
  -- Add invited members
  IF p_member_ids IS NOT NULL THEN
    FOREACH v_member_id IN ARRAY p_member_ids LOOP
      -- Skip if trying to add creator again
      IF v_member_id != auth.uid() THEN
        INSERT INTO event_members (event_id, user_id, role)
        VALUES (v_event_id, v_member_id, 'member')
        ON CONFLICT (event_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  
  RETURN v_event_id;
END;
$$;

-- Function to get event details with members and rooms
CREATE OR REPLACE FUNCTION get_event_details(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Check if user has access to this event
  IF NOT EXISTS (
    SELECT 1 FROM event_members em 
    WHERE em.event_id = p_event_id AND em.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to event';
  END IF;

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
      ORDER BY 
        CASE WHEN em.role = 'owner' THEN 1 ELSE 2 END,
        em.joined_at
    ),
    'rooms', (
      SELECT json_agg(
        json_build_object(
          'group_id', eg.id,
          'group_name', eg.name,
          'description', eg.description,
          'total_amount', eg.total_amount,
          'status', eg.status,
          'created_at', eg.created_at,
          'created_by', eg.created_by,
          'participants', (
            SELECT COALESCE(json_agg(
              json_build_object(
                'user_id', ep.user_id,
                'amount_owed', ep.amount_owed,
                'amount_paid', ep.amount_paid,
                'is_settled', ep.is_settled,
                'user_name', u.name,
                'user_profile_picture', u.profilePicture
              )
            ), '[]'::json)
            FROM expense_participants ep
            JOIN users u ON u.id = ep.user_id
            WHERE ep.group_id = eg.id
          )
        )
      )
      FROM expense_groups eg
      WHERE eg.event_id = p_event_id
      ORDER BY eg.created_at DESC
    ),
    'stats', json_build_object(
      'total_rooms', (SELECT COUNT(*) FROM expense_groups WHERE event_id = p_event_id),
      'total_amount', (SELECT COALESCE(SUM(total_amount), 0) FROM expense_groups WHERE event_id = p_event_id),
      'member_count', (SELECT COUNT(*) FROM event_members WHERE event_id = p_event_id)
    )
  ) INTO v_result
  FROM events e
  WHERE e.id = p_event_id;
  
  RETURN v_result;
END;
$$;

-- Function to get user's events
CREATE OR REPLACE FUNCTION get_user_events(p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_user_id UUID;
BEGIN
  -- Use current user if no user_id provided
  v_target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Users can only see their own events
  IF v_target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', e.id,
        'name', e.name,
        'description', e.description,
        'start_date', e.start_date,
        'end_date', e.end_date,
        'created_by', e.created_by,
        'created_at', e.created_at,
        'role', em.role,
        'stats', json_build_object(
          'room_count', (SELECT COUNT(*) FROM expense_groups WHERE event_id = e.id),
          'member_count', (SELECT COUNT(*) FROM event_members WHERE event_id = e.id),
          'total_amount', (SELECT COALESCE(SUM(total_amount), 0) FROM expense_groups WHERE event_id = e.id)
        )
      ) ORDER BY e.created_at DESC
    ), '[]'::json)
    FROM events e
    JOIN event_members em ON em.event_id = e.id
    WHERE em.user_id = v_target_user_id
  );
END;
$$;

-- Function to add member to event
CREATE OR REPLACE FUNCTION add_event_member(
  p_event_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'member'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is an owner of the event
  IF NOT EXISTS (
    SELECT 1 FROM event_members em 
    WHERE em.event_id = p_event_id AND em.user_id = auth.uid() AND em.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only event owners can add members';
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('owner', 'member') THEN
    RAISE EXCEPTION 'Invalid role. Must be "owner" or "member"';
  END IF;
  
  -- Add the member
  INSERT INTO event_members (event_id, user_id, role)
  VALUES (p_event_id, p_user_id, p_role)
  ON CONFLICT (event_id, user_id) DO UPDATE SET
    role = EXCLUDED.role;
  
  RETURN TRUE;
END;
$$;

-- Function to remove member from event
CREATE OR REPLACE FUNCTION remove_event_member(
  p_event_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check permissions: either user removing themselves (if member) or owner removing others
  IF NOT (
    (auth.uid() = p_user_id AND 
     EXISTS (SELECT 1 FROM event_members WHERE event_id = p_event_id AND user_id = p_user_id AND role = 'member')
    ) OR
    EXISTS (SELECT 1 FROM event_members WHERE event_id = p_event_id AND user_id = auth.uid() AND role = 'owner')
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  -- Prevent removing the last owner
  IF EXISTS (SELECT 1 FROM event_members WHERE event_id = p_event_id AND user_id = p_user_id AND role = 'owner') THEN
    IF (SELECT COUNT(*) FROM event_members WHERE event_id = p_event_id AND role = 'owner') = 1 THEN
      RAISE EXCEPTION 'Cannot remove the last owner of an event';
    END IF;
  END IF;
  
  -- Remove the member
  DELETE FROM event_members
  WHERE event_id = p_event_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to update event details
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
BEGIN
  -- Check if user is an owner of the event
  IF NOT EXISTS (
    SELECT 1 FROM event_members em 
    WHERE em.event_id = p_event_id AND em.user_id = auth.uid() AND em.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only event owners can update event details';
  END IF;
  
  -- Validate dates if provided
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    IF p_end_date < p_start_date THEN
      RAISE EXCEPTION 'End date cannot be before start date';
    END IF;
  END IF;
  
  -- Update the event (only update non-null values)
  UPDATE events SET
    name = COALESCE(trim(p_name), name),
    description = COALESCE(p_description, description),
    start_date = COALESCE(p_start_date, start_date),
    end_date = COALESCE(p_end_date, end_date),
    updated_at = NOW()
  WHERE id = p_event_id;
  
  RETURN FOUND;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION create_event(TEXT, TEXT, DATE, DATE, UUID[]) IS 
'Creates a new event with the current user as owner and optionally adds invited members';

COMMENT ON FUNCTION get_event_details(UUID) IS 
'Returns complete event details including members, rooms, and statistics';

COMMENT ON FUNCTION get_user_events(UUID) IS 
'Returns all events that the user is a member of with basic statistics';

COMMENT ON FUNCTION add_event_member(UUID, UUID, TEXT) IS 
'Adds a member to an event. Only event owners can add members';

COMMENT ON FUNCTION remove_event_member(UUID, UUID) IS 
'Removes a member from an event. Members can remove themselves, owners can remove others';

COMMENT ON FUNCTION update_event(UUID, TEXT, TEXT, DATE, DATE) IS 
'Updates event details. Only event owners can update events';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Event management functions created successfully!';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '- create_event(name, description, start_date, end_date, member_ids)';
    RAISE NOTICE '- get_event_details(event_id)';
    RAISE NOTICE '- get_user_events(user_id)';
    RAISE NOTICE '- add_event_member(event_id, user_id, role)';
    RAISE NOTICE '- remove_event_member(event_id, user_id)';
    RAISE NOTICE '- update_event(event_id, name, description, start_date, end_date)';
END $$;