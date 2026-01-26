-- Создание таблицы presentations для хранения метаданных презентаций
CREATE TABLE IF NOT EXISTS presentations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, -- Название презентации (например, "Ольга Португалия")
  type TEXT CHECK (type IN ('company', 'wedding')) DEFAULT 'wedding', -- Тип: компания или свадьба
  pdf_url TEXT, -- URL для доступа к PDF из Storage
  pdf_file_path TEXT, -- Путь файла в Storage (presentations/{wedding_id}/...)
  pdf_file_size BIGINT, -- Размер файла в байтах
  is_default BOOLEAN DEFAULT FALSE, -- Является ли это презентацией компании по умолчанию
  order_index INTEGER DEFAULT 0, -- Порядок отображения (для сортировки)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы presentation_sections для частей презентации
CREATE TABLE IF NOT EXISTS presentation_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, -- Название части (например, "Концепция")
  page_number INTEGER NOT NULL, -- Номер страницы PDF
  order_index INTEGER DEFAULT 0, -- Порядок отображения внутри презентации
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_presentations_wedding_id ON presentations(wedding_id);
CREATE INDEX IF NOT EXISTS idx_presentations_is_default ON presentations(is_default);
CREATE INDEX IF NOT EXISTS idx_presentation_sections_presentation_id ON presentation_sections(presentation_id);

-- Триггеры для автоматического обновления updated_at

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_presentations_updated_at'
  ) THEN
    CREATE TRIGGER update_presentations_updated_at BEFORE UPDATE ON presentations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_presentation_sections_updated_at'
  ) THEN
    CREATE TRIGGER update_presentation_sections_updated_at BEFORE UPDATE ON presentation_sections
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Row Level Security (RLS) политики

-- Включаем RLS для новых таблиц
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_sections ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Clients can view own wedding presentations" ON presentations;
CREATE POLICY "Clients can view own wedding presentations" ON presentations
  FOR SELECT USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE client_id = auth.uid()
    )
  );


DROP POLICY IF EXISTS "Organizers can view presentations" ON presentations;
CREATE POLICY "Organizers can view presentations" ON presentations
  FOR SELECT USING (true);

-- Организаторы могут создавать/обновлять/удалять презентации


DROP POLICY IF EXISTS "Organizers can manage presentations" ON presentations;
CREATE POLICY "Organizers can manage presentations" ON presentations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('organizer', 'main_organizer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('organizer', 'main_organizer')
    )
  );


DROP POLICY IF EXISTS "Clients can view own presentation sections" ON presentation_sections;
CREATE POLICY "Clients can view own presentation sections" ON presentation_sections
  FOR SELECT USING (
    presentation_id IN (
      SELECT id FROM presentations 
      WHERE wedding_id IN (
        SELECT id FROM weddings WHERE client_id = auth.uid()
      )
    )
  );


DROP POLICY IF EXISTS "Organizers can view presentation sections" ON presentation_sections;
CREATE POLICY "Organizers can view presentation sections" ON presentation_sections
  FOR SELECT USING (true);

-- Организаторы могут управлять секциями своих презентаций


DROP POLICY IF EXISTS "Organizers can manage presentation sections" ON presentation_sections;
CREATE POLICY "Organizers can manage presentation sections" ON presentation_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('organizer', 'main_organizer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('organizer', 'main_organizer')
    )
  );
