/*
# Add email column to profiles + username login helper

## Changes
1. Adds `email` column to profiles (stores user email for username-based login lookup)
2. Creates `get_user_email_by_username` RPC function accessible to authenticated clients
   so the login form can resolve a username to an email before calling signInWithPassword.

## Security
- The function is SECURITY DEFINER so it can read auth.users.email
- Only returns the email for an exact username match; returns null otherwise
- No RLS bypass for other data
*/

-- Add email column to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Function to look up email by username (used for username-based login)
CREATE OR REPLACE FUNCTION get_user_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT u.email INTO v_email
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.username = p_username
  LIMIT 1;
  RETURN v_email;
END;
$$;
