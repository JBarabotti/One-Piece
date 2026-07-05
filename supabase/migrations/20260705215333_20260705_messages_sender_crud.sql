
-- Allow message senders to update and delete their own messages
CREATE POLICY "update_own_messages" ON messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "delete_own_messages" ON messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);
