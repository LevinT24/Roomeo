-- ADD UNIQUE CONSTRAINT FOR EXPENSE PARTICIPANTS
-- This must be run BEFORE 04_debug_create_event_room.sql
-- Ensures (group_id, user_id) combination is unique to support ON CONFLICT clause

-- Add unique constraint to prevent duplicate participants in same group
ALTER TABLE expense_participants 
ADD CONSTRAINT expense_participants_group_user_unique 
UNIQUE (group_id, user_id);

-- Verify constraint was added successfully
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'expense_participants'::regclass 
AND conname = 'expense_participants_group_user_unique';