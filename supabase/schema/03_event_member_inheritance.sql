-- Event Member Inheritance System
-- Description: Automatically inherits event members to rooms and handles member management
-- Dependencies: Requires 01_add_event_system.sql and 02_event_management_functions.sql
-- Date: 2025-01-01
-- Author: Claude Code Assistant

-- Function to handle automatic member inheritance when event members are added/removed
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
    
    RAISE NOTICE 'Added user % to % existing rooms in event %', NEW.user_id, 
      (SELECT COUNT(*) FROM expense_groups WHERE event_id = NEW.event_id), NEW.event_id;
    
    RETURN NEW;
  END IF;
  
  -- When a member is removed from an event
  IF TG_OP = 'DELETE' THEN
    -- Only remove from rooms if they have no outstanding balances and no pending settlements
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
    
    RAISE NOTICE 'Removed user % from settled rooms in event %', OLD.user_id, OLD.event_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Function to handle room creation in events (auto-add event members)
CREATE OR REPLACE FUNCTION handle_event_room_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_member_id UUID;
BEGIN
  -- Only process if this room belongs to an event
  IF NEW.event_id IS NOT NULL THEN
    -- Add all event members to this new room
    FOR v_member_id IN 
      SELECT user_id FROM event_members WHERE event_id = NEW.event_id
    LOOP
      INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
      VALUES (NEW.id, v_member_id, 0, 0, false)
      ON CONFLICT (group_id, user_id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Added % event members to new room %', 
      (SELECT COUNT(*) FROM event_members WHERE event_id = NEW.event_id), NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to override room membership (remove event inheritance for specific room)
CREATE OR REPLACE FUNCTION override_room_membership(
  p_room_id UUID,
  p_user_id UUID,
  p_action TEXT -- 'add' or 'remove'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_is_room_creator BOOLEAN;
  v_is_event_owner BOOLEAN;
BEGIN
  -- Check if current user has permission to modify this room
  SELECT 
    eg.event_id,
    (eg.created_by = auth.uid()) as is_creator
  INTO v_event_id, v_is_room_creator
  FROM expense_groups eg
  WHERE eg.id = p_room_id;
  
  -- Check if user is event owner (if room belongs to event)
  IF v_event_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM event_members em 
      WHERE em.event_id = v_event_id AND em.user_id = auth.uid() AND em.role = 'owner'
    ) INTO v_is_event_owner;
  END IF;
  
  -- Only room creator or event owner can modify membership
  IF NOT (v_is_room_creator OR v_is_event_owner) THEN
    RAISE EXCEPTION 'Permission denied. Only room creator or event owner can modify membership';
  END IF;

  IF p_action = 'add' THEN
    -- Add user to room (even if not an event member)
    INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
    VALUES (p_room_id, p_user_id, 0, 0, false)
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Added user % to room % (manual override)', p_user_id, p_room_id;
    RETURN TRUE;
    
  ELSIF p_action = 'remove' THEN
    -- Check if user can be safely removed
    IF EXISTS (
      SELECT 1 FROM expense_participants ep
      WHERE ep.group_id = p_room_id AND ep.user_id = p_user_id
      AND (ep.amount_owed != ep.amount_paid OR EXISTS (
        SELECT 1 FROM settlements s 
        WHERE s.group_id = p_room_id 
        AND (s.payer_id = p_user_id OR s.receiver_id = p_user_id)
        AND s.status = 'pending'
      ))
    ) THEN
      RAISE EXCEPTION 'Cannot remove user with outstanding balance or pending settlements';
    END IF;
    
    -- Remove user from room
    DELETE FROM expense_participants
    WHERE group_id = p_room_id AND user_id = p_user_id;
    
    RAISE NOTICE 'Removed user % from room % (manual override)', p_user_id, p_room_id;
    RETURN FOUND;
  ELSE
    RAISE EXCEPTION 'Invalid action. Must be "add" or "remove"';
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Enhanced function to create expense group with event support
CREATE OR REPLACE FUNCTION create_expense_group_with_event(
  p_name TEXT,
  p_total_amount DECIMAL(10,2),
  p_participants UUID[],
  p_description TEXT DEFAULT NULL,
  p_split_type TEXT DEFAULT 'equal',
  p_custom_amounts DECIMAL(10,2)[] DEFAULT NULL,
  p_event_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id UUID;
  v_participant_id UUID;
  v_amount_owed DECIMAL(10,2);
  v_event_members UUID[];
  v_final_participants UUID[];
BEGIN
  -- Create the expense group
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, event_id)
  VALUES (p_name, p_description, auth.uid(), p_total_amount, p_split_type, p_event_id)
  RETURNING id INTO v_group_id;

  -- If this room is part of an event, merge event members with specified participants
  IF p_event_id IS NOT NULL THEN
    -- Verify user has access to this event
    IF NOT EXISTS (
      SELECT 1 FROM event_members em 
      WHERE em.event_id = p_event_id AND em.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Access denied to event';
    END IF;
    
    -- Get all event members
    SELECT ARRAY(
      SELECT user_id FROM event_members WHERE event_id = p_event_id
    ) INTO v_event_members;
    
    -- Merge event members with specified participants (event members take priority)
    v_final_participants := array_cat(v_event_members, p_participants);
    
    -- Remove duplicates and ensure current user is included
    SELECT array_agg(DISTINCT participant_id) 
    FROM (
      SELECT auth.uid() as participant_id  -- Always include current user
      UNION
      SELECT unnest(v_final_participants) as participant_id
    ) t INTO v_final_participants;
  ELSE
    v_final_participants := p_participants;
  END IF;

  -- Add participants with calculated amounts
  FOR i IN 1..array_length(v_final_participants, 1) LOOP
    v_participant_id := v_final_participants[i];
    
    -- Calculate amount owed
    IF p_split_type = 'custom' AND p_custom_amounts IS NOT NULL AND i <= array_length(p_custom_amounts, 1) THEN
      v_amount_owed := p_custom_amounts[i];
    ELSE
      v_amount_owed := p_total_amount / array_length(v_final_participants, 1);
    END IF;
    
    -- Insert participant
    INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
    VALUES (v_group_id, v_participant_id, v_amount_owed, 0, false)
    ON CONFLICT (group_id, user_id) DO UPDATE SET
      amount_owed = EXCLUDED.amount_owed;
  END LOOP;

  RAISE NOTICE 'Created expense group % with % participants in event %', 
    v_group_id, array_length(v_final_participants, 1), p_event_id;

  RETURN v_group_id;
END;
$$;

-- Create triggers for automatic member inheritance
DROP TRIGGER IF EXISTS trigger_event_member_inheritance ON event_members;
CREATE TRIGGER trigger_event_member_inheritance
  AFTER INSERT OR DELETE ON event_members
  FOR EACH ROW
  EXECUTE FUNCTION handle_event_member_inheritance();

DROP TRIGGER IF EXISTS trigger_event_room_creation ON expense_groups;
CREATE TRIGGER trigger_event_room_creation
  AFTER INSERT ON expense_groups
  FOR EACH ROW
  EXECUTE FUNCTION handle_event_room_creation();

-- Add comments for documentation
COMMENT ON FUNCTION handle_event_member_inheritance() IS 
'Trigger function that automatically adds/removes event members from rooms when event membership changes';

COMMENT ON FUNCTION handle_event_room_creation() IS 
'Trigger function that automatically adds all event members to newly created rooms in that event';

COMMENT ON FUNCTION override_room_membership(UUID, UUID, TEXT) IS 
'Allows room creators or event owners to manually override member inheritance for specific rooms';

COMMENT ON FUNCTION create_expense_group_with_event(TEXT, DECIMAL, UUID[], TEXT, TEXT, DECIMAL[], UUID) IS 
'Enhanced expense group creation that supports event context and automatic member inheritance';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Event member inheritance system created successfully!';
    RAISE NOTICE 'Triggers activated:';
    RAISE NOTICE '- Event members will auto-inherit to existing rooms';
    RAISE NOTICE '- New rooms in events will auto-include all event members';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '- override_room_membership(room_id, user_id, action)';
    RAISE NOTICE '- create_expense_group_with_event(name, amount, participants, ...)';
END $$;