-- Открытый текст пароля подрядчиков только для отображения в кабинете организатора
-- (проверка входа по-прежнему через contractor_password_hash)

ALTER TABLE weddings
ADD COLUMN IF NOT EXISTS contractor_password_plain TEXT;

COMMENT ON COLUMN weddings.contractor_password_plain IS 'Копия пароля подрядчиков для отображения организатору; не отдаётся в get_contractor_wedding_by_access';

DROP FUNCTION IF EXISTS setup_contractor_access(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION setup_contractor_access(
  p_wedding_id UUID,
  p_password TEXT,
  p_dress_code TEXT DEFAULT NULL,
  p_organizer_contacts TEXT DEFAULT NULL,
  p_coordinator_contacts TEXT DEFAULT NULL,
  p_venue_address TEXT DEFAULT NULL,
  p_maps_url TEXT DEFAULT NULL
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
    contractor_password_plain = trim(p_password),
    contractor_dress_code = p_dress_code,
    contractor_organizer_contacts = p_organizer_contacts,
    contractor_coordinator_contacts = p_coordinator_contacts,
    contractor_venue_address = p_venue_address,
    contractor_maps_url = p_maps_url,
    updated_at = NOW()
  WHERE id = p_wedding_id;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION setup_contractor_access(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
