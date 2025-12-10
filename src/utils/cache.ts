// Утилита для кеширования данных с TTL (Time To Live)

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Время жизни в миллисекундах
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 минут по умолчанию

/**
 * Сохранить данные в кеш
 */
export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('Error setting cache:', error);
    // Если localStorage переполнен, очищаем старые записи
    clearExpiredCache();
  }
}

/**
 * Получить данные из кеша
 */
export function getCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    if (!cached) {
      return null;
    }

    const cacheItem: CacheItem<T> = JSON.parse(cached);
    const now = Date.now();
    const age = now - cacheItem.timestamp;

    // Проверяем, не истек ли срок действия кеша
    if (age > cacheItem.ttl) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }

    return cacheItem.data;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
}

/**
 * Удалить данные из кеша
 */
export function removeCache(key: string): void {
  try {
    localStorage.removeItem(`cache_${key}`);
  } catch (error) {
    console.error('Error removing cache:', error);
  }
}

/**
 * Очистить все кешированные данные
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Очистить истекшие записи кеша
 */
function clearExpiredCache(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach((key) => {
      if (key.startsWith('cache_')) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheItem: CacheItem<unknown> = JSON.parse(cached);
            const age = now - cacheItem.timestamp;
            if (age > cacheItem.ttl) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Если не удалось распарсить, удаляем запись
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
}

/**
 * Инвалидировать кеш для конкретного ключа
 */
export function invalidateCache(key: string): void {
  removeCache(key);
}

/**
 * Инвалидировать все кеши, связанные с пользователем
 */
export function invalidateUserCache(userId: string): void {
  const keys = [
    `wedding_${userId}`,
    `tasks_${userId}`,
    `documents_${userId}`,
  ];

  keys.forEach((key) => removeCache(key));
}

