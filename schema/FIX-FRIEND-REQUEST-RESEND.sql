-- ===============================
-- Fix Friend Request Re-sending Issue
-- This allows users to send friend requests again after unfriending
-- ===============================

-- Create or replace the send_friend_request function
CREATE OR REPLACE FUNCTION send_friend_request(
  sender_user_id UUID,
  receiver_user_id UUID
) RETURNS JSON AS $$
DECLARE
  existing_request friend_requests%ROWTYPE;
  existing_friendship friendships%ROWTYPE;
  new_request_id UUID;
  smaller_id UUID;
  larger_id UUID;
BEGIN
  -- Basic validation
  IF sender_user_id = receiver_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot send friend request to yourself'
    );
  END IF;

  -- Check if they are already friends
  IF sender_user_id < receiver_user_id THEN
    smaller_id := sender_user_id;
    larger_id := receiver_user_id;
  ELSE
    smaller_id := receiver_user_id;
    larger_id := sender_user_id;
  END IF;

  SELECT * INTO existing_friendship 
  FROM friendships 
  WHERE user1_id = smaller_id AND user2_id = larger_id;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Users are already friends'
    );
  END IF;

  -- Check for existing friend request (any status)
  SELECT * INTO existing_request 
  FROM friend_requests 
  WHERE sender_id = sender_user_id AND receiver_id = receiver_user_id;

  IF FOUND THEN
    -- If request exists but is declined, update it to pending
    -- If request exists and is pending, return error
    -- If request exists and is accepted, this shouldn't happen (should be friendship)
    CASE existing_request.status
      WHEN 'pending' THEN
        RETURN json_build_object(
          'success', false,
          'error', 'Friend request already exists'
        );
      WHEN 'declined' THEN
        -- Update the existing declined request to pending
        UPDATE friend_requests 
        SET status = 'pending', updated_at = NOW()
        WHERE id = existing_request.id;
        
        RETURN json_build_object(
          'success', true,
          'request_id', existing_request.id,
          'request', json_build_object(
            'id', existing_request.id,
            'sender_id', sender_user_id,
            'receiver_id', receiver_user_id,
            'status', 'pending',
            'created_at', existing_request.created_at,
            'updated_at', NOW()
          )
        );
      WHEN 'accepted' THEN
        -- This case should not happen if friendships table is consistent
        -- But if it does, delete the old request and create new one
        DELETE FROM friend_requests WHERE id = existing_request.id;
    END CASE;
  END IF;

  -- Check for reverse friend request (receiver already sent to sender)
  SELECT * INTO existing_request 
  FROM friend_requests 
  WHERE sender_id = receiver_user_id AND receiver_id = sender_user_id AND status = 'pending';

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This user has already sent you a friend request'
    );
  END IF;

  -- Create new friend request
  INSERT INTO friend_requests (sender_id, receiver_id, status)
  VALUES (sender_user_id, receiver_user_id, 'pending')
  RETURNING id INTO new_request_id;

  -- Return success with the new request details
  RETURN json_build_object(
    'success', true,
    'request_id', new_request_id,
    'request', json_build_object(
      'id', new_request_id,
      'sender_id', sender_user_id,
      'receiver_id', receiver_user_id,
      'status', 'pending',
      'created_at', NOW(),
      'updated_at', NOW()
    )
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition where request was created between checks
    RETURN json_build_object(
      'success', false,
      'error', 'Friend request already exists'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Internal server error'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create the get_friend_requests function if it doesn't exist
CREATE OR REPLACE FUNCTION get_friend_requests(user_id UUID)
RETURNS JSON AS $$
DECLARE
  sent_requests JSON;
  received_requests JSON;
  total_pending INTEGER;
BEGIN
  -- Get sent requests with receiver details
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', fr.id,
      'receiver_id', fr.receiver_id,
      'status', fr.status,
      'created_at', fr.created_at,
      'receiver', json_build_object(
        'id', u.id,
        'name', u.name,
        'profilePicture', u.profilePicture,
        'location', u.location
      )
    )
  ), '[]'::json) INTO sent_requests
  FROM friend_requests fr
  JOIN users u ON u.id = fr.receiver_id
  WHERE fr.sender_id = user_id AND fr.status = 'pending';

  -- Get received requests with sender details
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', fr.id,
      'sender_id', fr.sender_id,
      'status', fr.status,
      'created_at', fr.created_at,
      'sender', json_build_object(
        'id', u.id,
        'name', u.name,
        'profilePicture', u.profilePicture,
        'location', u.location
      )
    )
  ), '[]'::json) INTO received_requests
  FROM friend_requests fr
  JOIN users u ON u.id = fr.sender_id
  WHERE fr.receiver_id = user_id AND fr.status = 'pending';

  -- Count total pending (sent + received)
  SELECT COUNT(*)::INTEGER INTO total_pending
  FROM friend_requests 
  WHERE (sender_id = user_id OR receiver_id = user_id) AND status = 'pending';

  RETURN json_build_object(
    'sentRequests', sent_requests,
    'receivedRequests', received_requests,
    'totalPending', total_pending
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;