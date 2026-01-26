-- Создание таблицы profiles для расширенной информации о пользователях
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT CHECK (role IN ('client', 'organizer', 'main_organizer')) DEFAULT 'client',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы weddings (свадьбы)
CREATE TABLE IF NOT EXISTS weddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  couple_name_1 TEXT NOT NULL,
  couple_name_2 TEXT NOT NULL,
  wedding_date DATE NOT NULL,
  country TEXT NOT NULL,
  venue TEXT NOT NULL,
  guest_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы tasks (задания)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы documents (документы)
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT DEFAULT 'application/pdf',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_weddings_client_id ON weddings(client_id);
CREATE INDEX IF NOT EXISTS idx_weddings_organizer_id ON weddings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_wedding_id ON tasks(wedding_id);
CREATE INDEX IF NOT EXISTS idx_documents_wedding_id ON documents(wedding_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weddings_updated_at BEFORE UPDATE ON weddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) политики

-- Включаем RLS для всех таблиц
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Политики для profiles
-- Пользователи могут видеть свой профиль
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Пользователи могут обновлять свой профиль
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Политики для weddings
-- Клиенты могут видеть только свои свадьбы
CREATE POLICY "Clients can view own weddings" ON weddings
  FOR SELECT USING (
    auth.uid() = client_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'client')
  );

-- Организаторы могут видеть все свадьбы, которые они организуют
CREATE POLICY "Organizers can view their weddings" ON weddings
  FOR SELECT USING (
    auth.uid() = organizer_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organizer')
  );

-- Только организаторы могут создавать/обновлять/удалять свадьбы
CREATE POLICY "Organizers can manage weddings" ON weddings
  FOR ALL USING (
    auth.uid() = organizer_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'organizer')
  );

-- Политики для tasks
-- Клиенты могут видеть задания только для своих свадеб
CREATE POLICY "Clients can view tasks for own weddings" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM weddings
      WHERE weddings.id = tasks.wedding_id
      AND weddings.client_id = auth.uid()
    )
  );

-- Организаторы могут видеть и управлять заданиями для своих свадеб
CREATE POLICY "Organizers can manage tasks" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM weddings
      WHERE weddings.id = tasks.wedding_id
      AND weddings.organizer_id = auth.uid()
    )
  );

-- Политики для documents
-- Клиенты могут видеть документы только для своих свадеб
CREATE POLICY "Clients can view documents for own weddings" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM weddings
      WHERE weddings.id = documents.wedding_id
      AND weddings.client_id = auth.uid()
    )
  );

-- Организаторы могут видеть и управлять документами для своих свадеб
CREATE POLICY "Organizers can manage documents" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM weddings
      WHERE weddings.id = documents.wedding_id
      AND weddings.organizer_id = auth.uid()
    )
  );

