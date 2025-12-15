-- ============================================
-- Разрешаем клиентам обновлять поле notes в своих свадьбах
-- ============================================

-- Создаем политику, которая позволяет клиентам обновлять только поле notes
CREATE POLICY "Clients can update own notes" ON weddings
  FOR UPDATE USING (
    auth.uid() = client_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'client')
  )
  WITH CHECK (
    auth.uid() = client_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'client')
  );

-- Комментарий к политике
COMMENT ON POLICY "Clients can update own notes" ON weddings IS 
  'Позволяет клиентам обновлять только поле notes в своих свадьбах';

