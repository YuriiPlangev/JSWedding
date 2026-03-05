-- Migrate contractor access from user account model to token + password model

-- Enable pgcrypto extension (ensure it exists in extensions schema)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Add new access fields
ALTER TABLE weddings
ADD COLUMN IF NOT EXISTS contractor_token UUID UNIQUE DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS contractor_password_hash TEXT;

-- Remove old account-link field if present
-- First drop the policy that depends on contractor_user_id
DROP POLICY IF EXISTS "Contractors can view their event documents" ON contractor_documents;

DROP INDEX IF EXISTS idx_weddings_contractor_user_id;
ALTER TABLE weddings DROP COLUMN IF EXISTS contractor_user_id;

-- Helper: check if current user is organizer of wedding or main organizer
CREATE OR REPLACE FUNCTION can_manage_wedding(p_wedding_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid() 
      AND p.role IN ('organizer', 'main_organizer')
  );
$$;

-- Setup or refresh contractor access for event
CREATE OR REPLACE FUNCTION setup_contractor_access(
  p_wedding_id UUID,
  p_password TEXT,
  p_dress_code TEXT DEFAULT NULL,
  p_organizer_contacts TEXT DEFAULT NULL,
  p_coordinator_contacts TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT can_manage_wedding(p_wedding_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_password IS NULL OR length(trim(p_password)) < 4 THEN
    RAISE EXCEPTION 'Password must be at least 4 characters';
  END IF;

  v_token := COALESCE((SELECT contractor_token FROM weddings WHERE id = p_wedding_id), gen_random_uuid());

  UPDATE weddings
  SET
    contractor_token = v_token,
    contractor_password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
    contractor_dress_code = p_dress_code,
    contractor_organizer_contacts = p_organizer_contacts,
    contractor_coordinator_contacts = p_coordinator_contacts,
    updated_at = NOW()
  WHERE id = p_wedding_id;

  RETURN v_token;
END;
$$;

-- Verify access by token/password and return wedding id
CREATE OR REPLACE FUNCTION verify_contractor_access(
  p_token UUID,
  p_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wedding_id UUID;
  v_hash TEXT;
BEGIN
  SELECT id, contractor_password_hash
  INTO v_wedding_id, v_hash
  FROM weddings
  WHERE contractor_token = p_token;

  IF v_wedding_id IS NULL OR v_hash IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_hash = extensions.crypt(p_password, v_hash) THEN
    RETURN v_wedding_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Drop old version of function to ensure clean recreation
DROP FUNCTION IF EXISTS get_contractor_wedding_by_access(UUID, TEXT);

-- Read wedding data through token/password verification
CREATE OR REPLACE FUNCTION get_contractor_wedding_by_access(
  p_token UUID,
  p_password TEXT
)
RETURNS TABLE(
  id UUID,
  couple_name_1_en TEXT,
  couple_name_1_ru TEXT,
  couple_name_2_en TEXT,
  couple_name_2_ru TEXT,
  wedding_date DATE,
  venue TEXT,
  guest_count INTEGER,
  contractor_dress_code TEXT,
  contractor_organizer_contacts TEXT,
  contractor_coordinator_contacts TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wedding_id UUID;
BEGIN
  v_wedding_id := verify_contractor_access(p_token, p_password);

  IF v_wedding_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    w.id,
    w.couple_name_1_en,
    w.couple_name_1_ru,
    w.couple_name_2_en,
    w.couple_name_2_ru,
    w.wedding_date,
    w.venue,
    w.guest_count,
    w.contractor_dress_code,
    w.contractor_organizer_contacts,
    w.contractor_coordinator_contacts
  FROM weddings w
  WHERE w.id = v_wedding_id;
END;
$$;

-- Read contractor documents through token/password verification
CREATE OR REPLACE FUNCTION get_contractor_documents_by_access(
  p_token UUID,
  p_password TEXT
)
RETURNS SETOF contractor_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wedding_id UUID;
BEGIN
  v_wedding_id := verify_contractor_access(p_token, p_password);

  IF v_wedding_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM contractor_documents
  WHERE wedding_id = v_wedding_id
  ORDER BY created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION setup_contractor_access(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_contractor_access(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_contractor_wedding_by_access(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_contractor_documents_by_access(UUID, TEXT) TO anon, authenticated;
