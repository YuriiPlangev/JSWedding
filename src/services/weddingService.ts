import { supabase } from '../lib/supabase';
import type { Wedding, Task, Document, User, Presentation } from '../types';
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
      .maybeSingle();

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

  // Получить свадьбу по ID (для организатора)
  async getWeddingById(weddingId: string): Promise<Wedding | null> {
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('id', weddingId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching wedding:', error);
      return null;
    }

    return data;
  },

  // Создать свадьбу (только для организатора)
  async createWedding(wedding: Omit<Wedding, 'id' | 'created_at' | 'updated_at'>): Promise<Wedding | null> {
    const { data, error } = await supabase
      .from('weddings')
      .insert(wedding)
      .select()
      .single();

    if (error) {
      console.error('Error creating wedding:', error);
      return null;
    }

    // Инвалидируем кеш
    invalidateCache(`wedding_${wedding.client_id}`);

    return data;
  },

  // Обновить свадьбу (только для организатора)
  async updateWedding(weddingId: string, updates: Partial<Wedding>): Promise<Wedding | null> {
    const { data: wedding } = await supabase
      .from('weddings')
      .select('client_id')
      .eq('id', weddingId)
      .maybeSingle();

    const { data, error } = await supabase
      .from('weddings')
      .update(updates)
      .eq('id', weddingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating wedding:', error);
      return null;
    }

    // Инвалидируем кеш
    if (wedding) {
      invalidateCache(`wedding_${wedding.client_id}`);
    }

    return data;
  },

  // Удалить свадьбу (только для организатора)
  async deleteWedding(weddingId: string): Promise<boolean> {
    const { data: wedding } = await supabase
      .from('weddings')
      .select('client_id')
      .eq('id', weddingId)
      .single();

    const { error } = await supabase
      .from('weddings')
      .delete()
      .eq('id', weddingId);

    if (error) {
      console.error('Error deleting wedding:', error);
      return false;
    }

    // Инвалидируем кеш
    if (wedding) {
      invalidateCache(`wedding_${wedding.client_id}`);
    }

    return true;
  },

  // Обновить заметки клиента (только для клиента)
  async updateNotes(weddingId: string, notes: string): Promise<boolean> {
    const { error } = await supabase
      .from('weddings')
      .update({ notes })
      .eq('id', weddingId);

    if (error) {
      console.error('Error updating notes:', error);
      return false;
    }

    // Инвалидируем кеш
    const { data: wedding } = await supabase
      .from('weddings')
      .select('client_id')
      .eq('id', weddingId)
      .maybeSingle();

    if (wedding) {
      invalidateCache(`wedding_${wedding.client_id}`);
    }

    return true;
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
    file?: File
  ): Promise<Document | null> {
    // Если есть ссылка, создаем документ со ссылкой
    if (document.link && !file) {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...document,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating document:', error);
        return null;
      }

      // Инвалидируем кеш документов для этой свадьбы
      if (data) {
        invalidateCache(`documents_${document.wedding_id}`);
      }

      return data;
    }

    // Если нет файла и нет ссылки, создаем документ только с названием
    if (!file && !document.link) {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...document,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating document:', error);
        return null;
      }

      // Инвалидируем кеш документов для этой свадьбы
      if (data) {
        invalidateCache(`documents_${document.wedding_id}`);
      }

      return data;
    }

    // Загружаем файл в Storage
    // На этом этапе file должен быть определен (все случаи без файла уже обработаны выше)
    if (!file) {
      console.error('File is required but not provided');
      return null;
    }

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

  // Обновить документ (только для организатора)
  async updateDocument(
    documentId: string,
    updates: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'>>,
    weddingId: string,
    newFile?: File
  ): Promise<Document | null> {
    // Если есть новый файл, сначала загружаем его
    if (newFile) {
      // Получаем старый документ для удаления старого файла
      const { data: oldDoc } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      // Загружаем новый файл
      const fileExt = newFile.name.split('.').pop();
      const fileName = `${weddingId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('wedding-documents')
        .upload(fileName, newFile);

      if (uploadError) {
        console.error('Error uploading new file:', uploadError);
        return null;
      }

      // Удаляем старый файл, если он был
      if (oldDoc?.file_path) {
        await supabase.storage.from('wedding-documents').remove([oldDoc.file_path]);
      }

      // Обновляем документ с новым файлом
      const { data, error } = await supabase
        .from('documents')
        .update({
          ...updates,
          file_path: fileName,
          file_size: newFile.size,
          mime_type: newFile.type,
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        console.error('Error updating document:', error);
        // Удаляем загруженный файл в случае ошибки
        await supabase.storage.from('wedding-documents').remove([fileName]);
        return null;
      }

      // Инвалидируем кеш документов для этой свадьбы
      if (data) {
        invalidateCache(`documents_${weddingId}`);
      }

      return data;
    } else {
      // Обновляем только метаданные без файла
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        console.error('Error updating document:', error);
        return null;
      }

      // Инвалидируем кеш документов для этой свадьбы
      if (data) {
        invalidateCache(`documents_${weddingId}`);
      }

      return data;
    }
  },

  // Удалить документ (только для организатора)
  async deleteDocument(documentId: string, filePath: string | undefined, weddingId: string): Promise<boolean> {
    // Удаляем файл из Storage (если он есть)
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('wedding-documents')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
      }
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

// Сервис для работы с клиентами (для организатора)
export const clientService = {
  // Получить всех клиентов (для организатора)
  async getAllClients(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }

    return (data || []).map((profile) => ({
      id: profile.id,
      email: profile.email || '',
      name: profile.name || '',
      role: 'client' as const,
      avatar: profile.avatar_url,
    }));
  },

  // Получить клиента по ID
  async getClientById(clientId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', clientId)
      .eq('role', 'client')
      .maybeSingle();

    if (error) {
      console.error('Error fetching client:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      email: data.email || '',
      name: data.name || '',
      role: 'client' as const,
      avatar: data.avatar_url,
    };
  },
};

// Сервис для работы с презентациями
export const presentationService = {
  // Получить презентацию компании по умолчанию
  getDefaultCompanyPresentation(): Presentation {
    return {
      type: 'company',
      title: 'Презентація компанії',
      sections: [
        { id: 0, name: 'Ваш організатор - Юлія Солодченко', image_url: '' },
        { id: 1, name: 'Про нас', image_url: '' },
        { id: 2, name: 'Чому обирають нас?', image_url: '' },
        { id: 3, name: 'Етапи роботи з нами', image_url: '' },
        { id: 4, name: 'Вартість', image_url: '' },
        { id: 5, name: 'Контакти', image_url: '' },
      ],
    };
  },

  // Загрузить изображение презентации в Storage
  async uploadPresentationImage(weddingId: string, file: File, sectionId: number): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `presentations/${weddingId}/section_${sectionId}_${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('wedding-documents')
      .upload(fileName, file);

    if (error) {
      console.error('Error uploading presentation image:', error);
      return null;
    }

    // Создаем signed URL для изображения
    const { data: urlData } = await supabase.storage
      .from('wedding-documents')
      .createSignedUrl(fileName, 31536000); // URL действителен 1 год

    return urlData?.signedUrl || null;
  },

  // Удалить изображение презентации из Storage
  async deletePresentationImage(imageUrl: string): Promise<boolean> {
    if (!imageUrl) return true; // Если URL пустой, ничего не делаем
    
    // Извлекаем путь из URL, если это signed URL
    // Signed URL имеет формат: https://...?token=...
    // Нужно извлечь путь из query параметра или из самого URL
    let filePath = imageUrl;
    
    // Если это signed URL, пытаемся извлечь путь
    try {
      const url = new URL(imageUrl);
      // Путь обычно находится в самом URL до знака вопроса
      const pathMatch = url.pathname.match(/presentations\/.+$/);
      if (pathMatch) {
        filePath = pathMatch[0];
      } else {
        // Если не нашли в pathname, пробуем найти в самом URL
        const altMatch = imageUrl.match(/presentations\/[^?]+/);
        if (altMatch) {
          filePath = altMatch[0];
        } else {
          console.error('Could not extract file path from URL:', imageUrl);
          return false;
        }
      }
    } catch (e) {
      // Если это не валидный URL, возможно это уже путь
      const pathMatch = imageUrl.match(/presentations\/.+/);
      if (pathMatch) {
        filePath = pathMatch[0];
      } else {
        console.error('Invalid file path format:', imageUrl);
        return false;
      }
    }

    const { error } = await supabase.storage
      .from('wedding-documents')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting presentation image:', error);
      return false;
    }

    return true;
  },

  // Обновить презентацию свадьбы
  async updatePresentation(weddingId: string, presentation: Presentation): Promise<boolean> {
    const { error } = await supabase
      .from('weddings')
      .update({ presentation })
      .eq('id', weddingId);

    if (error) {
      console.error('Error updating presentation:', error);
      return false;
    }

    // Инвалидируем кеш
    const { data: wedding } = await supabase
      .from('weddings')
      .select('client_id')
      .eq('id', weddingId)
      .maybeSingle();

    if (wedding) {
      invalidateCache(`wedding_${wedding.client_id}`);
    }

    return true;
  },

  // Удалить презентацию (вернуть к презентации компании по умолчанию)
  async deletePresentation(weddingId: string): Promise<boolean> {
    // Получаем текущую презентацию
    const { data: wedding } = await supabase
      .from('weddings')
      .select('presentation')
      .eq('id', weddingId)
      .maybeSingle();

    if (!wedding) {
      return false;
    }

    // Удаляем изображения из Storage, если это была презентация свадьбы
    if (wedding.presentation && wedding.presentation.type === 'wedding') {
      const deletePromises = wedding.presentation.sections
        .filter((section) => section.image_url)
        .map((section) => this.deletePresentationImage(section.image_url));

      await Promise.all(deletePromises);
    }

    // Удаляем презентацию из БД (устанавливаем null)
    const { error } = await supabase
      .from('weddings')
      .update({ presentation: null })
      .eq('id', weddingId);

    if (error) {
      console.error('Error deleting presentation:', error);
      return false;
    }

    // Инвалидируем кеш
    const { data: updatedWedding } = await supabase
      .from('weddings')
      .select('client_id')
      .eq('id', weddingId)
      .maybeSingle();

    if (updatedWedding) {
      invalidateCache(`wedding_${updatedWedding.client_id}`);
    }

    return true;
  },
};

