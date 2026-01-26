-- Create storage bucket for presentations
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'presentations',
  'presentations',
  true, -- Публичный доступ для чтения
  52428800, -- 50MB максимальный размер файла
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- RLS политики для bucket presentations

-- Организаторы могут загружать файлы
DROP POLICY IF EXISTS "Organizers can upload presentations" ON storage.objects;
CREATE POLICY "Organizers can upload presentations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'presentations' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('organizer', 'main_organizer')
  )
);

-- Организаторы могут обновлять свои файлы
DROP POLICY IF EXISTS "Organizers can update presentations" ON storage.objects;
CREATE POLICY "Organizers can update presentations"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'presentations' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('organizer', 'main_organizer')
  )
)
WITH CHECK (
  bucket_id = 'presentations' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('organizer', 'main_organizer')
  )
);

-- Организаторы могут удалять свои файлы
DROP POLICY IF EXISTS "Organizers can delete presentations" ON storage.objects;
CREATE POLICY "Organizers can delete presentations"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'presentations' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('organizer', 'main_organizer')
  )
);

-- Все аутентифицированные пользователи могут читать файлы (клиенты видят свои презентации)
DROP POLICY IF EXISTS "Authenticated users can view presentations" ON storage.objects;
CREATE POLICY "Authenticated users can view presentations"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'presentations');

-- Публичный доступ для чтения (если нужен)
DROP POLICY IF EXISTS "Public can view presentations" ON storage.objects;
CREATE POLICY "Public can view presentations"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'presentations');
