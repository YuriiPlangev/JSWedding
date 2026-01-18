// Типы пользователей
export type UserRole = 'client' | 'organizer' | 'main_organizer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

// Типы для свадьбы
export interface Wedding {
  id: string;
  client_id: string; // ID клиента из auth.users
  organizer_id: string; // ID организатора из auth.users
  project_name?: string; // Название проекта (только для организатора)
  couple_name_1_en: string; // Имя первого партнера на английском
  couple_name_1_ru: string; // Имя первого партнера на русском
  couple_name_2_en: string; // Имя второго партнера на английском
  couple_name_2_ru: string; // Имя второго партнера на русском
  wedding_date: string; // Дата свадьбы
  country: string; // Страна празднования (для обратной совместимости)
  country_en?: string; // Страна празднования на английском
  country_ru?: string; // Страна празднования на русском
  country_ua?: string; // Страна празднования на украинском
  venue: string; // Место празднования
  guest_count: number; // Число гостей
  chat_link?: string; // Ссылка на чат с организатором
  notes?: string; // Заметки клиента о свадьбе
  welcome_message_en?: string; // Кастомное приветственное сообщение на английском (для основного приветствия)
  splash_welcome_text_en?: string; // Полный текст приветствия в заглушке на английском (включая имена)
  full_welcome_text_en?: string; // Полный текст приветствия в основном контенте на английском (включая имена)
  presentation?: Presentation; // Презентация (компании или свадьбы)
  created_at: string;
  updated_at: string;
}

// Типы для событий свадьбы (для организатора)
export interface WeddingEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  status: 'planning' | 'confirmed' | 'completed';
  budget: number;
  guestCount: number;
}

// Типы для блоков заданий организатора
export interface TaskGroup {
  id: string;
  organizer_id: string; // ID организатора
  name: string; // Название блока (только на русском)
  color?: string; // Цвет блока (hex код)
  created_at: string;
  updated_at: string;
}

// Типы для заданий
export interface Task {
  id: string;
  wedding_id: string | null; // ID свадьбы (null для заданий организатора)
  organizer_id: string | null; // ID организатора (для внутренних заданий)
  task_group_id: string | null; // ID блока заданий (для заданий организатора)
  title: string; // Название задания (для обратной совместимости)
  title_en?: string; // Название задания на английском
  title_ru?: string; // Название задания на русском
  title_ua?: string; // Название задания на украинском
  link?: string; // Ссылка задачи (может отсутствовать)
  link_text?: string; // Текст ссылки для отображения (для обратной совместимости)
  link_text_en?: string; // Текст ссылки на английском
  link_text_ru?: string; // Текст ссылки на русском
  link_text_ua?: string; // Текст ссылки на украинском
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high'; // Срочность задания
  assigned_organizer_id?: string | null; // ID организатора-исполнителя
  order?: number; // Порядок отображения
  created_at: string;
  updated_at: string;
}

// Типы для документов
export interface Document {
  id: string;
  wedding_id: string; // ID свадьбы
  name: string; // Название документа (для обратной совместимости)
  name_en?: string; // Название документа на английском
  name_ru?: string; // Название документа на русском
  name_ua?: string; // Название документа на украинском
  link?: string; // Ссылка на документ (для Google Docs/Sheets/Drive)
  pinned?: boolean; // Закреплен ли документ
  order?: number; // Порядок отображения (для незакрепленных документов, закрепленные всегда сверху)
  file_path?: string; // Путь к файлу в Supabase Storage (опционально, если есть link)
  file_url?: string; // URL для скачивания
  file_size?: number; // Размер файла в байтах
  mime_type?: string; // MIME тип (например, application/pdf)
  created_at: string;
  updated_at: string;
}

// Типы для уведомлений
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

// Типы для презентации
export interface PresentationSection {
  id: number;
  name: string;
  image_url: string; // URL изображения из Storage или внешний URL
}

// Типы для авансов
export interface Event {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Advance {
  id: string;
  event_id: string;
  date: string;
  amount: number;
  purpose: string | null;
  payment_method: 'крипта' | 'наличка' | 'карта';
  currency?: 'грн' | 'доллар' | 'евро';
  created_at: string;
  updated_at: string;
}

// Типы для зарплат
export interface Employee {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Salary {
  id: string;
  employee_id: string;
  month: string; // Первое число месяца (YYYY-MM-01)
  salary: number;
  salary_currency?: 'грн' | 'доллар' | 'евро'; // Валюта для зарплаты
  bonus: number;
  bonus_currency?: 'доллар' | 'евро'; // Валюта для бонуса
  created_at: string;
  updated_at: string;
}

export interface CoordinationPayment {
  id: string;
  salary_id: string;
  name: string; // Название координации (например, "Координация Киев Едем")
  amount: number;
  currency?: 'грн' | 'доллар' | 'евро';
  created_at: string;
  updated_at: string;
}

// Типы для оплат подрядчикам
export interface ContractorPayment {
  id: string;
  created_by: string;
  event_id: string;
  service: string; // Услуга
  cost: number; // Стоимость
  cost_currency?: 'грн' | 'доллар' | 'евро'; // Валюта стоимости
  percent: number; // Сумма организатора (конкретная сумма, не процент)
  percent_currency?: 'грн' | 'доллар' | 'евро'; // Валюта суммы организатора
  advance: number; // Аванс
  advance_currency?: 'грн' | 'доллар' | 'евро'; // Валюта аванса
  date: string; // Дата
  currency?: 'грн' | 'доллар' | 'евро'; // Валюта (старое поле, для обратной совместимости)
  comment?: string | null; // Комментарий
  to_pay: number; // К Оплате (вычисляемое поле: cost - advance - percent)
  created_at: string;
  updated_at: string;
}

export interface Presentation {
  type: 'company' | 'wedding'; // Тип презентации: компания или свадьба
  title: string; // Название презентации
  sections: PresentationSection[]; // Секции презентации
}

// Типы для логов заданий организаторов
export interface OrganizerTaskLog {
  id: string;
  task_id: string;
  organizer_id: string;
  old_status: 'pending' | 'in_progress' | 'completed' | null;
  new_status: 'pending' | 'in_progress' | 'completed';
  action: 'completed' | 'uncompleted' | 'started' | 'paused' | 'edited';
  created_at: string;
  organizer?: User; // Информация об организаторе (при join)
}