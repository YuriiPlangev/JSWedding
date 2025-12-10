import { supabase } from '../lib/supabase';
import type { Wedding, Task, Document } from '../types';
import { getCache, setCache, invalidateCache } from '../utils/cache';

// Сервис для работы со свадьбами
export const weddingService = {
  // Получить свадьбу клиента
  async getClientWedding(clientId: string, useCache: boolean = true): Promise<Wedding | null> {
    const cacheKey = `wedding_${clientId}`;

    // Проверяем кеш
    if (useCache) {
      const cached = getCache<Wedding>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (error) {
      console.error('Error fetching wedding:', error);
      return null;
    }

    // Сохраняем в кеш на 5 минут
    if (data) {
      setCache(cacheKey, data, 5 * 60 * 1000);
    }

    return data;
  },

  // Получить все свадьбы организатора
  async getOrganizerWeddings(organizerId: string): Promise<Wedding[]> {
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching weddings:', error);
      return [];
    }

    return data || [];
  },
};

// Сервис для работы с заданиями
export const taskService = {
  // Получить все задания для свадьбы
  async getWeddingTasks(weddingId: string, useCache: boolean = true): Promise<Task[]> {
    const cacheKey = `tasks_${weddingId}`;

    // Проверяем кеш
    if (useCache) {
      const cached = getCache<Task[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }

    const tasks = data || [];

    // Сохраняем в кеш на 3 минуты (задания могут обновляться чаще)
    setCache(cacheKey, tasks, 3 * 60 * 1000);

    return tasks;
  },

  // Создать задание (только для организатора)
  async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return null;
    }

    // Инвалидируем кеш заданий для этой свадьбы
    if (data) {
      invalidateCache(`tasks_${task.wedding_id}`);
    }

    return data;
  },

  // Обновить задание (только для организатора)
  async updateTask(taskId: string, updates: Partial<Task>, weddingId?: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return null;
    }

    // Инвалидируем кеш заданий для этой свадьбы
    if (data && (weddingId || data.wedding_id)) {
      invalidateCache(`tasks_${weddingId || data.wedding_id}`);
    }

    return data;
  },

  // Удалить задание (только для организатора)
  async deleteTask(taskId: string, weddingId: string): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      return false;
    }

    // Инвалидируем кеш заданий для этой свадьбы
    invalidateCache(`tasks_${weddingId}`);

    return true;
  },
};

// Сервис для работы с документами
export const documentService = {
  // Получить все документы для свадьбы
  async getWeddingDocuments(weddingId: string, useCache: boolean = true): Promise<Document[]> {
    const cacheKey = `documents_${weddingId}`;

    // Проверяем кеш
    if (useCache) {
      const cached = getCache<Document[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return [];
    }

    // Генерируем URL для скачивания для каждого документа
    // Только для документов с file_path (не для документов со ссылками)
    const documentsWithUrls = await Promise.all(
      (data || []).map(async (doc) => {
        // Если есть file_path, создаем signed URL
        if (doc.file_path) {
          const { data: urlData } = await supabase.storage
            .from('wedding-documents')
            .createSignedUrl(doc.file_path, 3600); // URL действителен 1 час

          return {
            ...doc,
            file_url: urlData?.signedUrl || null,
          };
        }

        // Если нет file_path, значит документ использует link
        return {
          ...doc,
          file_url: null,
        };
      })
    );

    // Сохраняем в кеш на 10 минут (документы обновляются реже)
    setCache(cacheKey, documentsWithUrls, 10 * 60 * 1000);

    return documentsWithUrls;
  },

  // Скачать документ
  async downloadDocument(document: Document): Promise<Blob | null> {
    if (!document.file_path) {
      console.error('Document file_path is missing');
      return null;
    }

    const { data, error } = await supabase.storage
      .from('wedding-documents')
      .download(document.file_path);

    if (error) {
      console.error('Error downloading document:', error);
      return null;
    }

    return data;
  },

  // Создать документ (только для организатора)
  async createDocument(
    document: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'>,
    file: File
  ): Promise<Document | null> {
    // Загружаем файл в Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${document.wedding_id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('wedding-documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return null;
    }

    // Создаем запись в базе данных
    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...document,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      // Удаляем загруженный файл в случае ошибки
      await supabase.storage.from('wedding-documents').remove([fileName]);
      return null;
    }

    // Инвалидируем кеш документов для этой свадьбы
    if (data) {
      invalidateCache(`documents_${document.wedding_id}`);
    }

    return data;
  },

  // Удалить документ (только для организатора)
  async deleteDocument(documentId: string, filePath: string, weddingId: string): Promise<boolean> {
    // Удаляем файл из Storage
    const { error: storageError } = await supabase.storage
      .from('wedding-documents')
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
    }

    // Удаляем запись из базы данных
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      console.error('Error deleting document:', error);
      return false;
    }

    // Инвалидируем кеш документов для этой свадьбы
    invalidateCache(`documents_${weddingId}`);

    return true;
  },
};

