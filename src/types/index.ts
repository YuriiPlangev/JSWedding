// Типы пользователей
export type UserRole = 'client' | 'organizer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

// Типы для свадебных событий
export interface WeddingEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  status: 'planning' | 'confirmed' | 'completed' | 'cancelled';
  budget?: number;
  guestCount?: number;
  description?: string;
}

// Типы для задач
export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
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
