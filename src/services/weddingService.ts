import { supabase } from '../lib/supabase';
import type { Wedding, Task, Document, User, Presentation, PresentationSection } from '../types';
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

    // Убираем поля, которые не должны обновляться, и undefined значения
    const cleanUpdates: Record<string, any> = {};
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key];
      // Пропускаем системные поля, поля, которые не должны изменяться после создания, и несуществующие поля
      if (
        key !== 'id' && 
        key !== 'created_at' && 
        key !== 'updated_at' &&
        key !== 'organizer_id' && // organizer_id не должен изменяться после создания
        key !== 'client_id' && // client_id не должен изменяться после создания
        key !== 'welcome_message_en' && // Это поле не существует в БД
        value !== undefined
      ) {
        // Обрабатываем пустые строки для опциональных полей - оставляем их
        cleanUpdates[key] = value;
      }
    });

    console.log('=== UPDATE WEDDING START ===');
    console.log('Wedding ID:', weddingId);
    console.log('Cleaned updates:', JSON.stringify(cleanUpdates, null, 2));
    
    // Используем RPC функцию для обновления, чтобы обойти проблемы с RLS
    const { data, error: rpcError } = await supabase
      .rpc('update_wedding', {
        wedding_id: weddingId,
        updates: cleanUpdates as any
      });
    
    console.log('RPC response - data:', data);
    console.log('RPC response - error:', rpcError);

    if (rpcError) {
      console.error('Error updating wedding via RPC:', rpcError);
      console.error('Error details:', {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code,
      });
      console.error('Update data:', cleanUpdates);
      console.error('Wedding ID:', weddingId);
      
      // Если RPC функция не найдена, пробуем обычный способ
      if (rpcError.code === '42883' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
        console.log('⚠️ RPC function not found, trying direct update...');
        console.log('⚠️ This means the SQL function needs to be created in Supabase!');
        console.log('⚠️ Please run: supabase/update_wedding_function.sql');
        // Fallback к прямому обновлению
        const { data: updateData, error: updateError } = await supabase
          .from('weddings')
          .update(cleanUpdates)
          .eq('id', weddingId)
          .select();

        console.log('Direct update response - data:', updateData);
        console.log('Direct update response - error:', updateError);

        if (updateError) {
          console.error('❌ Error updating wedding directly:', updateError);
          return null;
        }

        // Если update прошел успешно, но данных нет (из-за RLS), все равно инвалидируем кеш
        if (!updateData || updateData.length === 0) {
          console.warn('⚠️ Wedding update executed but no data returned (RLS issue)');
          console.warn('⚠️ Cache invalidated - data should refresh on next load');
          // Инвалидируем кеш, чтобы при следующем запросе данные обновились
          if (wedding) {
            invalidateCache(`wedding_${wedding.client_id}`);
          }
          // Возвращаем объект, чтобы показать, что обновление прошло
          return { id: weddingId } as Wedding;
        }

        console.log('✅ Wedding updated successfully (direct method):', updateData[0]);
        if (wedding) {
          invalidateCache(`wedding_${wedding.client_id}`);
        }
        return updateData[0];
      }
      
      return null;
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.warn('Wedding updated but no data returned:', weddingId);
      // Инвалидируем кеш, чтобы при следующем запросе данные обновились
      if (wedding) {
        invalidateCache(`wedding_${wedding.client_id}`);
      }
      return null;
    }

    // RPC функция возвращает массив, берем первый элемент
    const updatedWedding = Array.isArray(data) ? data[0] : data;
    console.log('✅ Wedding updated successfully via RPC:', updatedWedding);
    console.log('=== UPDATE WEDDING END ===');
    
    // Инвалидируем кеш
    if (wedding) {
      invalidateCache(`wedding_${wedding.client_id}`);
    }
    
    return updatedWedding;
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

// Функция для генерации ссылки на скачивание из внешней ссылки
function generateDownloadUrl(link: string): string | null {
  if (!link) return null;

  try {
    const url = new URL(link);

    // Google Docs
    // Формат: https://docs.google.com/document/d/{DOC_ID}/edit
    if (url.hostname.includes('docs.google.com') && url.pathname.includes('/document/d/')) {
      const docIdMatch = url.pathname.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (docIdMatch) {
        return `https://docs.google.com/document/d/${docIdMatch[1]}/export?format=pdf`;
      }
    }

    // Google Sheets
    // Формат: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
    if (url.hostname.includes('docs.google.com') && url.pathname.includes('/spreadsheets/d/')) {
      const sheetIdMatch = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetIdMatch) {
        return `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=xlsx`;
      }
    }

    // Google Slides
    // Формат: https://docs.google.com/presentation/d/{SLIDE_ID}/edit
    if (url.hostname.includes('docs.google.com') && url.pathname.includes('/presentation/d/')) {
      const slideIdMatch = url.pathname.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
      if (slideIdMatch) {
        return `https://docs.google.com/presentation/d/${slideIdMatch[1]}/export/pdf`;
      }
    }

    // Google Drive (если это прямая ссылка на файл)
    // Формат: https://drive.google.com/file/d/{FILE_ID}/view
    if (url.hostname.includes('drive.google.com') && url.pathname.includes('/file/d/')) {
      const fileIdMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
      }
    }

    // Для других ссылок возвращаем исходную ссылку
    // Пользователь может использовать прямую ссылку на скачивание
    return link;
  } catch (e) {
    // Если это не валидный URL, возвращаем исходную ссылку
    return link;
  }
}

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

    // Генерируем URL для скачивания для каждого документа на основе ссылки
    const documentsWithUrls = (data || []).map((doc) => {
      // Если есть ссылка, генерируем URL для скачивания
      if (doc.link) {
        return {
          ...doc,
          file_url: generateDownloadUrl(doc.link),
        };
      }

      // Если нет ссылки, значит документ без файла
      return {
        ...doc,
        file_url: null,
      };
    });

    // Сохраняем в кеш на 10 минут (документы обновляются реже)
    setCache(cacheKey, documentsWithUrls, 10 * 60 * 1000);

    return documentsWithUrls;
  },

  // Генерировать ссылку на скачивание из внешней ссылки
  generateDownloadUrl,

  // Создать документ (только для организатора)
  async createDocument(
    document: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'>
  ): Promise<Document | null> {
    // Создаем документ со ссылкой или без ссылки (только название)
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
  },

  // Обновить документ (только для организатора)
  async updateDocument(
    documentId: string,
    updates: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'>>,
    weddingId: string
  ): Promise<Document | null> {
    // Обновляем метаданные документа
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
  },

  // Удалить документ (только для организатора)
  async deleteDocument(documentId: string, _filePath: string | undefined, weddingId: string): Promise<boolean> {
    // Удаляем запись из базы данных
    // Файлы больше не хранятся в Storage, поэтому удаляем только запись
    // filePath оставлен для обратной совместимости, но не используется
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
    // Используем функцию, которая обходит RLS, если она существует
    // Иначе используем прямой запрос (может не работать из-за RLS)
    try {
      const { data, error } = await supabase.rpc('get_all_clients');
      
      if (error) {
        // Если функция не существует, пробуем прямой запрос
        if (error.message.includes('function') || error.message.includes('does not exist')) {
          const { data: directData, error: directError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'client')
            .order('name', { ascending: true });

          if (directError) {
            console.error('Error fetching clients:', directError);
            return [];
          }

          return (directData || []).map((profile) => ({
            id: profile.id,
            email: profile.email || '',
            name: profile.name || '',
            role: 'client' as const,
            avatar: profile.avatar_url,
          }));
        }
        
        console.error('Error fetching clients via RPC:', error);
        return [];
      }

      return (data || []).map((profile) => ({
        id: profile.id,
        email: profile.email || '',
        name: profile.name || '',
        role: 'client' as const,
        avatar: profile.avatar_url,
      }));
    } catch (err) {
      console.error('Error in getAllClients:', err);
      return [];
    }
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

  // Создать клиента в auth и profiles
  async createClient(email: string, password: string): Promise<User | null> {
    // Сохраняем текущую сессию организатора
    const { data: currentSession } = await supabase.auth.getSession();
    const currentAccessToken = currentSession?.session?.access_token;
    const currentRefreshToken = currentSession?.session?.refresh_token;

    try {
      // Используем email как имя по умолчанию
      const defaultName = email.split('@')[0];

      // 1. Создаем пользователя через signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: defaultName,
            role: 'client',
          },
        },
      });

      if (authError) {
        console.error('Error creating user:', authError);
        throw new Error(`Ошибка при создании пользователя: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Не удалось создать пользователя');
      }

      const userId = authData.user.id;

      // 2. Выходим из сессии созданного клиента
      await supabase.auth.signOut();

      // 3. Восстанавливаем сессию организатора
      if (currentAccessToken && currentRefreshToken) {
        await supabase.auth.setSession({
          access_token: currentAccessToken,
          refresh_token: currentRefreshToken,
        });
      }

      // 4. Создаем профиль через функцию базы данных (обходит RLS)
      // Функция create_user_profile должна быть создана в базе данных (см. supabase/create_profile_function.sql)
      const { error: rpcError } = await supabase.rpc('create_user_profile', {
        user_id: userId,
        user_email: email,
        user_name: defaultName,
        user_role: 'client'
      });

      if (rpcError) {
        console.error('Error creating profile via RPC:', rpcError);
        // Если функция не существует, выбрасываем понятную ошибку
        if (rpcError.message.includes('function') || rpcError.message.includes('does not exist')) {
          throw new Error('Функция создания профиля не настроена. Пожалуйста, выполните SQL скрипт supabase/create_profile_function.sql в Supabase SQL Editor');
        }
        throw new Error(`Ошибка при создании профиля: ${rpcError.message}`);
      }

      // 5. Функция выполнилась успешно, значит профиль создан
      // Не проверяем через SELECT, так как RLS может не позволять организатору читать профиль клиента сразу
      // Профиль точно создан, так как функция выполнилась без ошибок
      
      return {
        id: userId,
        email: email,
        name: defaultName,
        role: 'client' as const,
      };
    } catch (error) {
      // В случае ошибки также пытаемся восстановить сессию организатора
      if (currentAccessToken && currentRefreshToken) {
        try {
          await supabase.auth.setSession({
            access_token: currentAccessToken,
            refresh_token: currentRefreshToken,
          });
        } catch (restoreError) {
          console.error('Error restoring session after error:', restoreError);
        }
      }
      console.error('Error creating client:', error);
      throw error;
    }
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
        .filter((section: PresentationSection) => section.image_url)
        .map((section: PresentationSection) => this.deletePresentationImage(section.image_url));

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

