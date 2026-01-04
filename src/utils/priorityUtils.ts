/**
 * Получает цвет для приоритета задания
 */
export const getPriorityColor = (priority?: 'low' | 'medium' | 'high'): string => {
  switch (priority) {
    case 'high':
      return '#ef4444'; // red-500
    case 'medium':
      return '#f59e0b'; // amber-500
    case 'low':
      return '#10b981'; // green-500
    default:
      return '#6b7280'; // gray-500
  }
};

/**
 * Получает текст для приоритета задания
 */
export const getPriorityText = (priority?: 'low' | 'medium' | 'high'): string => {
  switch (priority) {
    case 'high':
      return 'Срочный';
    case 'medium':
      return 'Средний';
    case 'low':
      return 'Низкий';
    default:
      return '';
  }
};

/**
 * Получает классы для индикатора приоритета
 */
export const getPriorityClasses = (priority?: 'low' | 'medium' | 'high'): string => {
  const baseClasses = 'px-2 py-0.5 rounded text-[10px] font-medium';
  switch (priority) {
    case 'high':
      return `${baseClasses} bg-red-100 text-red-700 border border-red-300`;
    case 'medium':
      return `${baseClasses} bg-amber-100 text-amber-700 border border-amber-300`;
    case 'low':
      return `${baseClasses} bg-green-100 text-green-700 border border-green-300`;
    default:
      return '';
  }
};

