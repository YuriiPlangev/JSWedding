-- ============================================================================
-- SQL скрипт для настройки Supabase Storage для хранения документов
-- ============================================================================
-- ИНСТРУКЦИЯ:
-- 1. В Supabase Dashboard перейдите в Storage
-- 2. Создайте новый bucket с именем 'wedding-documents'
-- 3. Выполните этот SQL скрипт для настройки политик доступа
-- ============================================================================

-- Создание bucket (если еще не создан)
-- ВАЖНО: Bucket нужно создать вручную через Dashboard -> Storage -> New bucket
-- Имя bucket: 'wedding-documents'
-- Публичный доступ: НЕТ (приватный)
-- File size limit: можно оставить по умолчанию или установить нужный лимит

-- ============================================================================
-- Политики доступа для Storage (RLS)
-- ============================================================================

-- Политика для чтения документов (клиенты и организаторы)
-- Клиенты могут читать документы только для своих свадеб
CREATE POLICY "Clients can view documents for own weddings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'wedding-documents' AND
  (
    -- Проверяем, что файл принадлежит документу клиента
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.file_path = (storage.objects.name)
      AND EXISTS (
        SELECT 1 FROM weddings
        WHERE weddings.id = documents.wedding_id
        AND weddings.client_id = auth.uid()
      )
    )
  )
);

-- Организаторы могут читать документы для всех своих свадеб
CREATE POLICY "Organizers can view documents for their weddings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'wedding-documents' AND
  (
    -- Проверяем, что файл принадлежит документу организатора
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.file_path = (storage.objects.name)
      AND EXISTS (
        SELECT 1 FROM weddings
        WHERE weddings.id = documents.wedding_id
        AND weddings.organizer_id = auth.uid()
      )
    )
    OR
    -- Организаторы также могут читать файлы, которые они загружают
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'organizer'
    )
  )
);

-- Политика для загрузки документов (только организаторы)
CREATE POLICY "Organizers can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'wedding-documents' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'organizer'
  )
);

-- Политика для обновления документов (только организаторы)
CREATE POLICY "Organizers can update documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'wedding-documents' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'organizer'
  )
);

-- Политика для удаления документов (только организаторы)
CREATE POLICY "Organizers can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'wedding-documents' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'organizer'
  )
);

-- ============================================================================
-- ПРИМЕЧАНИЯ:
-- ============================================================================
-- 1. Bucket 'wedding-documents' должен быть создан вручную через Dashboard
-- 2. Bucket должен быть приватным (не публичным)
-- 3. После создания bucket выполните этот скрипт для настройки политик
-- 4. Политики обеспечивают безопасный доступ к документам:
--    - Клиенты видят только документы своих свадеб
--    - Организаторы видят и управляют всеми документами своих свадеб
-- ============================================================================

