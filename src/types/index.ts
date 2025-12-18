// Типы пользователей
export type UserRole = 'client' | 'organizer';

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

// Типы для заданий
export interface Task {
  id: string;
  wedding_id: string; // ID свадьбы
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

export interface Presentation {
  type: 'company' | 'wedding'; // Тип презентации: компания или свадьба
  title: string; // Название презентации
  sections: PresentationSection[]; // Секции презентации
}