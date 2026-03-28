-- Адрес места и ссылка на Google Maps для страницы подрядчиков

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

ALTER TABLE weddings
ADD COLUMN IF NOT EXISTS contractor_venue_address TEXT,
ADD COLUMN IF NOT EXISTS contractor_maps_url TEXT;

COMMENT ON COLUMN weddings.contractor_venue_address IS 'Точный адрес места проведения (для подрядчиков)';
COMMENT ON COLUMN weddings.contractor_maps_url IS 'Ссылка на Google Maps (для подрядчиков)';

-- Обновляем setup_contractor_access: два новых параметра
DROP FUNCTION IF EXISTS setup_contractor_access(UUID, TEXT, TEXT, TEXT, TEXT);

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

DROP FUNCTION IF EXISTS get_contractor_wedding_by_access(UUID, TEXT);

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
  country TEXT,
  country_en TEXT,
  country_ru TEXT,
  country_ua TEXT,
  venue TEXT,
  guest_count INTEGER,
  contractor_dress_code TEXT,
  contractor_organizer_contacts TEXT,
  contractor_coordinator_contacts TEXT,
  contractor_venue_address TEXT,
  contractor_maps_url TEXT
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
    w.country,
    w.country_en,
    w.country_ru,
    w.country_ua,
    w.venue,
    w.guest_count,
    w.contractor_dress_code,
    w.contractor_organizer_contacts,
    w.contractor_coordinator_contacts,
    w.contractor_venue_address,
    w.contractor_maps_url
  FROM weddings w
  WHERE w.id = v_wedding_id;
END;
$$;

GRANT EXECUTE ON FUNCTION setup_contractor_access(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_contractor_wedding_by_access(UUID, TEXT) TO anon, authenticated;
