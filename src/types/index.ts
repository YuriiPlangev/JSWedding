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
  country: string; // Страна празднования
  venue: string; // Место празднования
  guest_count: number; // Число гостей
  chat_link?: string; // Ссылка на чат с организатором
  notes?: string; // Заметки клиента о свадьбе
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
  title: string;
  link?: string; // Ссылка задачи (может отсутствовать)
  link_text?: string; // Текст ссылки для отображения (может отсутствовать)
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

// Типы для документов
export interface Document {
  id: string;
  wedding_id: string; // ID свадьбы
  name: string; // Название документа
  link?: string; // Ссылка на документ (для Google Docs/Sheets/Drive)
  pinned?: boolean; // Закреплен ли документ
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
