/**
 * Утилита для работы с языком приложения
 */

export type Language = 'en' | 'ru' | 'ua';

/**
 * Получает начальный язык из localStorage или возвращает русский по умолчанию
 */
export const getInitialLanguage = (): Language => {
  const savedLanguage = localStorage.getItem('preferredLanguage');
  if (savedLanguage === 'en' || savedLanguage === 'ru' || savedLanguage === 'ua') {
    return savedLanguage;
  }
  return 'ru';
};

