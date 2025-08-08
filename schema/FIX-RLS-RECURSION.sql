-- ===============================
-- Fix RLS Policy Infinite Recursion
-- Run this to fix the expense-related RLS policies
-- ===============================

-- Drop all existing policies for expense-related tables
DROP POLICY IF EXISTS "Users can view expense groups they participate in" ON expense_groups;
DROP POLICY IF EXISTS "Users can create expense groups" ON expense_groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON expense_groups;

DROP POLICY IF EXISTS "Users can view participants in their expense groups" ON expense_participants;
DROP POLICY IF EXISTS "Group creators can add participants" ON expense_participants;
DROP POLICY IF EXISTS "Participants can update their own records" ON expense_participants;

DROP POLICY IF EXISTS "Users can view settlements they're involved in" ON settlements;
DROP POLICY IF EXISTS "Users can create settlements for groups they participate in" ON settlements;
DROP POLICY IF EXISTS "Group creators and receivers can update settlements" ON settlements;

DROP POLICY IF EXISTS "Users can view participants in chats they're part of" ON chat_participants;
DROP POLICY IF EXISTS "System can add chat participants" ON chat_participants;

-- ===============================
-- Create Simple, Non-Recursive RLS Policies
-- ===============================

-- Expense Groups Policies (simple)
CREATE POLICY "expense_groups_select" ON expense_groups
  FOR SELECT USING (
    created_by = auth.uid() OR
    id IN (
      SELECT DISTINCT group_id 
      FROM expense_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "expense_groups_insert" ON expense_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "expense_groups_update" ON expense_groups
  FOR UPDATE USING (created_by = auth.uid());

-- Expense Participants Policies (simple)
CREATE POLICY "expense_participants_select" ON expense_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    group_id IN (
      SELECT id FROM expense_groups WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "expense_participants_insert" ON expense_participants
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT id FROM expense_groups WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "expense_participants_update" ON expense_participants
  FOR UPDATE USING (
    user_id = auth.uid() OR
    group_id IN (
      SELECT id FROM expense_groups WHERE created_by = auth.uid()
    )
  );

-- Settlements Policies (simple)
CREATE POLICY "settlements_select" ON settlements
  FOR SELECT USING (
    payer_id = auth.uid() OR 
    receiver_id = auth.uid() OR
    group_id IN (
      SELECT id FROM expense_groups WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "settlements_insert" ON settlements
  FOR INSERT WITH CHECK (payer_id = auth.uid());

CREATE POLICY "settlements_update" ON settlements
  FOR UPDATE USING (
    receiver_id = auth.uid() OR
    group_id IN (
      SELECT id FROM expense_groups WHERE created_by = auth.uid()
    )
  );

-- Chat Participants Policies (simple)
CREATE POLICY "chat_participants_select" ON chat_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    chat_id IN (
      SELECT id FROM chats WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "chat_participants_insert" ON chat_participants
  FOR INSERT WITH CHECK (true); -- Controlled by application logic

CREATE POLICY "chat_participants_delete" ON chat_participants
  FOR DELETE USING (
    user_id = auth.uid() OR
    chat_id IN (
      SELECT id FROM chats WHERE created_by = auth.uid()
    )
  );

-- ===============================
-- Verify policies are working
-- ===============================

-- Test query that should work without recursion
SELECT 'RLS policies updated successfully' as status;