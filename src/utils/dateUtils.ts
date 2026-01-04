/**
 * Утилиты для работы с датами
 */

/**
 * Форматирует дату и время для отображения
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Получает текст действия из типа действия
 */
export const getActionText = (action: string): string => {
  switch (action) {
    case 'completed': return 'Выполнил';
    case 'uncompleted': return 'Отменил выполнение';
    case 'started': return 'Начал';
    case 'paused': return 'Приостановил';
    case 'edited': return 'Изменил';
    default: return action;
  }
};

