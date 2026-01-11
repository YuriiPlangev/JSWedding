import { supabase } from '../lib/supabase';
import type { Wedding, Task, TaskGroup, Document, User, Presentation, PresentationSection, OrganizerTaskLog, UserRole, Event, Advance, Employee, Salary, ContractorPayment, CoordinationPayment } from '../types';
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
  // Теперь возвращает все свадьбы, доступные всем организаторам (благодаря RLS)
  async getOrganizerWeddings(_organizerId: string): Promise<Wedding[]> {
    // Убрали фильтр по organizer_id - теперь все организаторы видят все свадьбы
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching weddings:', error);
      return [];
    }

    return data || [];
  },

  // Получить все свадьбы (для главного организатора)
  async getAllWeddings(): Promise<Wedding[]> {
    try {
      // Используем функцию с SECURITY DEFINER для обхода RLS
      const { data, error } = await supabase.rpc('get_all_weddings');

      if (error) {
        console.error('Error fetching all weddings:', error);
        return [];
      }

      return (data || []) as Wedding[];
    } catch (err) {
      console.error('Error in getAllWeddings:', err);
      return [];
    }
  },

  // Получить свадьбу по ID (для организатора или главного организатора)
  async getWeddingById(weddingId: string, useRpcForMainOrganizer: boolean = false): Promise<Wedding | null> {
    // Если нужно использовать RPC функцию (для главного организатора)
    if (useRpcForMainOrganizer) {
      try {
        const { data, error } = await supabase.rpc('get_wedding_by_id', {
          wedding_id: weddingId
        });

        if (error) {
          console.error('Error fetching wedding by ID (RPC):', error);
          return null;
        }

        // Функция возвращает массив, берем первый элемент
        return Array.isArray(data) && data.length > 0 ? (data[0] as Wedding) : null;
      } catch (err) {
        console.error('Error in getWeddingById (RPC):', err);
        return null;
      }
    }

    // Обычный запрос для организаторов (RLS работает)
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
    try {
      // Используем SQL функцию для создания свадьбы (обходит RLS)
      const { data, error } = await supabase.rpc('create_wedding', {
        wedding_data: wedding as any,
      });

      if (error) {
        console.error('Error creating wedding:', error);
        return null;
      }

      // Инвалидируем кеш
      invalidateCache(`wedding_${wedding.client_id}`);

      // Функция возвращает массив, берем первый элемент
      return Array.isArray(data) ? data[0] : data;
    } catch (err) {
      console.error('Error in createWedding:', err);
      return null;
    }
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
    try {
      // Получаем информацию о свадьбе перед удалением (для инвалидации кеша)
      const { data: wedding } = await supabase
        .from('weddings')
        .select('client_id')
        .eq('id', weddingId)
        .single();

      if (!wedding) {
        console.error('Wedding not found:', weddingId);
        return false;
      }

      // Используем SQL функцию для удаления свадьбы (обходит RLS)
      const { error } = await supabase.rpc('delete_wedding', {
        wedding_id: weddingId,
      });

      if (error) {
        console.error('Error deleting wedding:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return false;
      }

      // Инвалидируем кеш
      invalidateCache(`wedding_${wedding.client_id}`);
      invalidateCache(`tasks_${weddingId}`);
      invalidateCache(`documents_${weddingId}`);

      return true;
    } catch (err) {
      console.error('Error in deleteWedding:', err);
      return false;
    }
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
  async getWeddingTasks(weddingId: string, useCache: boolean = true, useRpc: boolean = false): Promise<Task[]> {
    const cacheKey = `tasks_${weddingId}`;

    // Проверяем кеш
    if (useCache) {
      const cached = getCache<Task[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Если нужно использовать RPC функцию (для главного организатора)
    if (useRpc) {
      try {
        const { data, error } = await supabase.rpc('get_wedding_tasks', {
          p_wedding_id: weddingId
        });

        if (error) {
          console.error('Error fetching tasks by RPC:', error);
          return [];
        }

        const tasks = (data || []) as Task[];

        // Сохраняем в кеш на 3 минуты
        setCache(cacheKey, tasks, 3 * 60 * 1000);

        return tasks;
      } catch (err) {
        console.error('Error in getWeddingTasks (RPC):', err);
        return [];
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

    // Сортируем на клиенте по order (если поле существует), иначе по created_at
    const tasks = (data || []).sort((a, b) => {
      // Сначала сортируем по order (если поле существует и заполнено)
      if (a.order !== null && a.order !== undefined && b.order !== null && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== null && a.order !== undefined) return -1;
      if (b.order !== null && b.order !== undefined) return 1;
      // Если order нет, используем created_at
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

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

  // Обновить порядок заданий (только для организатора)
  async updateTasksOrder(weddingId: string, taskOrders: { id: string; order: number }[]): Promise<boolean> {
    try {
      // Обновляем порядок для всех заданий параллельно
      const updatePromises = taskOrders.map(({ id, order }) =>
        supabase
          .from('tasks')
          .update({ order })
          .eq('id', id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(result => result.error);
      
      // Если есть ошибки, проверяем, не связаны ли они с отсутствием колонки order
      if (errors.length > 0) {
        const hasColumnError = errors.some(result => 
          result.error?.code === '42703' || 
          result.error?.message?.includes('does not exist') ||
          result.error?.message?.includes('column') && result.error?.message?.includes('order')
        );
        
        if (hasColumnError) {
          console.warn('Column "order" does not exist in tasks table. Order updates will be ignored.');
          // Не считаем это критической ошибкой - просто колонка не существует
          return true;
        }
        
        console.error('Error updating tasks order:', errors);
        return false;
      }

      // Инвалидируем кеш заданий для этой свадьбы
      invalidateCache(`tasks_${weddingId}`);

      return true;
    } catch (error) {
      console.error('Error updating tasks order:', error);
      return false;
    }
  },

  // Получить все блоки заданий организатора
  // Теперь возвращает все группы, доступные всем организаторам (благодаря RLS)
  async getOrganizerTaskGroups(_organizerId: string, useCache: boolean = true): Promise<TaskGroup[]> {
    const cacheKey = `organizer_task_groups_all`; // Общий кеш для всех организаторов

    if (useCache) {
      const cached = getCache<TaskGroup[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Получаем все группы (RLS политика автоматически отфильтрует доступные)
    const { data, error } = await supabase
      .from('task_groups')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching task groups:', error);
      return [];
    }

    setCache(cacheKey, data || [], 5 * 60 * 1000);
    return data || [];
  },

  // Создать блок заданий
  async createTaskGroup(group: Omit<TaskGroup, 'id' | 'created_at' | 'updated_at'>): Promise<TaskGroup | null> {
    const { data, error } = await supabase
      .from('task_groups')
      .insert(group)
      .select()
      .single();

    if (error) {
      console.error('Error creating task group:', error);
      return null;
    }

    if (data) {
      // Инвалидируем общий кеш для всех организаторов
      invalidateCache(`organizer_task_groups_all`);
      invalidateCache(`organizer_tasks_by_groups_all`);
    }
    return data;
  },

  // Обновить блок заданий
  async updateTaskGroup(groupId: string, updates: Partial<TaskGroup>): Promise<TaskGroup | null> {
    // Логируем обновления для отладки
    console.log('[updateTaskGroup] Updating:', { groupId, updates });
    
    const { data, error } = await supabase
      .from('task_groups')
      .update(updates)
      .eq('id', groupId)
      .select()
      .single();

    if (error) {
      console.error('[updateTaskGroup] Error:', error);
      return null;
    }

    console.log('[updateTaskGroup] Success:', data);

    if (data) {
      // Инвалидируем общий кеш для всех организаторов
      invalidateCache(`organizer_task_groups_all`);
      invalidateCache(`organizer_tasks_by_groups_all`);
    }
    return data;
  },

  // Удалить блок заданий
  async deleteTaskGroup(groupId: string): Promise<boolean> {
    // Сначала получаем группу, чтобы инвалидировать кеш
    const { data: group } = await supabase
      .from('task_groups')
      .select('organizer_id')
      .eq('id', groupId)
      .single();

    const { error } = await supabase
      .from('task_groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      console.error('Error deleting task group:', error);
      return false;
    }

    if (group) {
      // Инвалидируем общий кеш для всех организаторов
      invalidateCache(`organizer_task_groups_all`);
      invalidateCache(`organizer_tasks_by_groups_all`);
    }
    return true;
  },

  // Получить все задания организатора по блокам
  // Теперь возвращает все задания, доступные всем организаторам (благодаря RLS)
  async getOrganizerTasksByGroups(_organizerId: string, useCache: boolean = true): Promise<{ group: TaskGroup | null; tasks: Task[]; isUnsorted?: boolean }[]> {
    const cacheKey = `organizer_tasks_by_groups_all`; // Общий кеш для всех организаторов

    if (useCache) {
      const cached = getCache<{ group: TaskGroup | null; tasks: Task[]; isUnsorted?: boolean }[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Получаем все блоки (RLS политика автоматически отфильтрует доступные)
    const groups = await taskService.getOrganizerTaskGroups(_organizerId, useCache);
    
    // Получаем все задания организаторов (RLS политика автоматически отфильтрует доступные)
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .is('wedding_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching organizer tasks:', error);
      return [];
    }

    // Задания с task_group_id = null (несортированные) - теперь все задания видны всем
    const unsortedTasks = (tasks || []).filter(task => task.task_group_id === null);

    // Группируем задания по блокам - теперь все задания видны всем
    const groupedTasks = groups.map(group => ({
      group,
      tasks: (tasks || []).filter(task => task.task_group_id === group.id),
      isUnsorted: false as const
    }));

    // Добавляем блок несортированных задач в начало, если есть такие задания
    const result: { group: TaskGroup | null; tasks: Task[]; isUnsorted?: boolean }[] = [];
    
    if (unsortedTasks.length > 0) {
      result.push({
        group: null,
        tasks: unsortedTasks,
        isUnsorted: true
      });
    }

    result.push(...groupedTasks);

    setCache(cacheKey, result, 3 * 60 * 1000);
    return result;
  },

  // Создать задание организатора
  async createOrganizerTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'wedding_id'>): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        wedding_id: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating organizer task:', error);
      return null;
    }

    // Инвалидируем общий кеш для всех организаторов
    invalidateCache(`organizer_tasks_by_groups_all`);
    invalidateCache(`organizer_task_groups_all`);

    return data;
  },

  // Обновить задание организатора
  async updateOrganizerTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .is('wedding_id', null)
      .select()
      .single();

    if (error) {
      console.error('Error updating organizer task:', error);
      return null;
    }

    // Инвалидируем общий кеш для всех организаторов
    invalidateCache(`organizer_tasks_by_groups_all`);
    invalidateCache(`organizer_task_groups_all`);

    return data;
  },

  // Удалить задание организатора
  async deleteOrganizerTask(taskId: string): Promise<boolean> {
    // Получаем задание для инвалидации кеша
    const { data: _task } = await supabase
      .from('tasks')
      .select('organizer_id')
      .eq('id', taskId)
      .single();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .is('wedding_id', null);

    if (error) {
      console.error('Error deleting organizer task:', error);
      return false;
    }

    // Инвалидируем общий кеш для всех организаторов
    invalidateCache(`organizer_tasks_by_groups_all`);
    invalidateCache(`organizer_task_groups_all`);

    return true;
  },

  // Получить логи выполнения заданий организаторов
  async getOrganizerTaskLogs(taskId?: string, limit: number = 100): Promise<OrganizerTaskLog[]> {
    // Сначала получаем логи
    let query = supabase
      .from('organizer_task_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (taskId) {
      query = query.eq('task_id', taskId);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching task logs:', error);
      return [];
    }

    if (!logs || logs.length === 0) {
      return [];
    }

    // Получаем уникальные ID организаторов
    const organizerIds = [...new Set(logs.map((log: any) => log.organizer_id).filter(Boolean))];

    // Получаем профили организаторов
    let profiles: any[] = [];
    if (organizerIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name, role, avatar_url')
        .in('id', organizerIds);

      if (profilesError) {
        console.error('Error fetching organizer profiles:', profilesError);
      } else {
        profiles = profilesData || [];
      }
    }

    // Создаем мапу профилей для быстрого доступа
    const profilesMap = new Map(profiles.map((p: any) => [p.id, p]));

    // Объединяем логи с профилями
    return logs.map((log: any) => {
      const profile = profilesMap.get(log.organizer_id);
      return {
        ...log,
        organizer: profile ? {
          id: profile.id,
          email: profile.email || '',
          name: profile.name || '',
          role: profile.role as UserRole,
          avatar: profile.avatar_url || undefined,
        } : undefined,
      };
    }) as OrganizerTaskLog[];
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
  async getWeddingDocuments(weddingId: string, useCache: boolean = true, useRpc: boolean = false): Promise<Document[]> {
    const cacheKey = `documents_${weddingId}`;

    // Проверяем кеш
    if (useCache) {
      const cached = getCache<Document[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Если нужно использовать RPC функцию (для главного организатора)
    if (useRpc) {
      try {
        const { data, error } = await supabase.rpc('get_wedding_documents', {
          p_wedding_id: weddingId
        });

        if (error) {
          console.error('Error fetching documents by RPC:', error);
          return [];
        }

        const documents = (data || []) as Document[];

        // Генерируем URL для скачивания для каждого документа на основе ссылки
        const documentsWithUrls = documents.map((doc) => {
          // Если есть ссылка, генерируем URL для скачивания
          if (doc.link) {
            return {
              ...doc,
              download_url: generateDownloadUrl(doc.link),
            };
          }
          return doc;
        });

        // Сохраняем в кеш на 5 минут
        setCache(cacheKey, documentsWithUrls, 5 * 60 * 1000);

        return documentsWithUrls;
      } catch (err) {
        console.error('Error in getWeddingDocuments (RPC):', err);
        return [];
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

    // Сортируем документы на клиенте: сначала закрепленные (pinned), потом по order (если поле существует)
    const sortedDocuments = (data || []).sort((a, b) => {
      // Закрепленные документы всегда сверху
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      // Если оба закреплены или оба незакреплены, сортируем по order
      if (a.pinned && b.pinned) {
        if (a.order !== null && a.order !== undefined && b.order !== null && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== null && a.order !== undefined) return -1;
        if (b.order !== null && b.order !== undefined) return 1;
      }
      
      // Для незакрепленных документов сортируем по order
      if (!a.pinned && !b.pinned) {
        if (a.order !== null && a.order !== undefined && b.order !== null && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== null && a.order !== undefined) return -1;
        if (b.order !== null && b.order !== undefined) return 1;
      }
      
      // Если order нет, используем created_at
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Генерируем URL для скачивания для каждого документа на основе ссылки
    const documentsWithUrls = sortedDocuments.map((doc) => {
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

  // Обновить порядок документов (только для организатора)
  async updateDocumentsOrder(weddingId: string, documentOrders: { id: string; order: number }[]): Promise<boolean> {
    try {
      // Обновляем порядок для всех документов параллельно
      const updatePromises = documentOrders.map(({ id, order }) =>
        supabase
          .from('documents')
          .update({ order })
          .eq('id', id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(result => result.error);
      
      // Если есть ошибки, проверяем, не связаны ли они с отсутствием колонки order
      if (errors.length > 0) {
        const hasColumnError = errors.some(result => 
          result.error?.code === '42703' || 
          result.error?.message?.includes('does not exist') ||
          result.error?.message?.includes('column') && result.error?.message?.includes('order')
        );
        
        if (hasColumnError) {
          console.warn('Column "order" does not exist in documents table. Order updates will be ignored.');
          // Не считаем это критической ошибкой - просто колонка не существует
          return true;
        }
        
        console.error('Error updating documents order:', errors);
        return false;
      }

      // Инвалидируем кеш документов для этой свадьбы
      invalidateCache(`documents_${weddingId}`);

      return true;
    } catch (error) {
      console.error('Error updating documents order:', error);
      return false;
    }
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

      return (data || []).map((profile: { id: string; email: string | null; name: string | null; avatar_url: string | null }) => ({
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

// Сервис для работы с организаторами
export const organizerService = {
  // Получить всех обычных организаторов (только с ролью 'organizer', без 'main_organizer')
  async getAllOrganizers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, role, avatar_url')
        .eq('role', 'organizer')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching organizers:', error);
        return [];
      }

      return (data || []).map((profile) => ({
        id: profile.id,
        email: profile.email || '',
        name: profile.name || '',
        role: profile.role as UserRole,
        avatar: profile.avatar_url || undefined,
      }));
    } catch (err) {
      console.error('Error in getAllOrganizers:', err);
      return [];
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

// Сервис для работы с авансами
export const advanceService = {
  // Получить все ивенты
  async getEvents(userId: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    return data || [];
  },

  // Создать новый ивент
  async createEvent(userId: string, name: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .insert({
        name,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return null;
    }

    return data;
  },

  // Обновить ивент
  async updateEvent(eventId: string, name: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .update({ name })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      return null;
    }

    return data;
  },

  // Удалить ивент
  async deleteEvent(eventId: string): Promise<boolean> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
      return false;
    }

    return true;
  },

  // Получить все авансы для ивента
  async getAdvancesByEvent(eventId: string): Promise<Advance[]> {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .eq('event_id', eventId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching advances:', error);
      return [];
    }

    return data || [];
  },

  // Создать аванс
  async createAdvance(advance: Omit<Advance, 'id' | 'created_at' | 'updated_at'>): Promise<Advance | null> {
    const { data, error } = await supabase
      .from('advances')
      .insert(advance)
      .select()
      .single();

    if (error) {
      console.error('Error creating advance:', error);
      return null;
    }

    return data;
  },

  // Обновить аванс
  async updateAdvance(advanceId: string, advance: Partial<Omit<Advance, 'id' | 'created_at' | 'updated_at'>>): Promise<Advance | null> {
    const { data, error } = await supabase
      .from('advances')
      .update(advance)
      .eq('id', advanceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating advance:', error);
      return null;
    }

    return data;
  },

  // Удалить аванс
  async deleteAdvance(advanceId: string): Promise<boolean> {
    const { error } = await supabase
      .from('advances')
      .delete()
      .eq('id', advanceId);

    if (error) {
      console.error('Error deleting advance:', error);
      return false;
    }

    return true;
  },
};

// Сервис для работы с зарплатами
export const salaryService = {
  // Получить всех сотрудников
  async getEmployees(userId: string): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching employees:', error);
      return [];
    }

    return data || [];
  },

  // Создать нового сотрудника
  async createEmployee(userId: string, name: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        name,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating employee:', error);
      return null;
    }

    return data;
  },

  // Обновить сотрудника
  async updateEmployee(employeeId: string, name: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .update({ name })
      .eq('id', employeeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      return null;
    }

    return data;
  },

  // Удалить сотрудника
  async deleteEmployee(employeeId: string): Promise<boolean> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId);

    if (error) {
      console.error('Error deleting employee:', error);
      return false;
    }

    return true;
  },

  // Получить все зарплаты для сотрудника
  async getSalariesByEmployee(employeeId: string): Promise<Salary[]> {
    const { data, error } = await supabase
      .from('salaries')
      .select('*')
      .eq('employee_id', employeeId)
      .order('month', { ascending: false });

    if (error) {
      console.error('Error fetching salaries:', error);
      return [];
    }

    return data || [];
  },

  // Создать зарплату
  async createSalary(salary: Omit<Salary, 'id' | 'created_at' | 'updated_at'>): Promise<Salary | null> {
    const { data, error } = await supabase
      .from('salaries')
      .insert(salary)
      .select()
      .single();

    if (error) {
      console.error('Error creating salary:', error);
      return null;
    }

    return data;
  },

  // Обновить зарплату
  async updateSalary(salaryId: string, salary: Partial<Omit<Salary, 'id' | 'created_at' | 'updated_at'>>): Promise<Salary | null> {
    const { data, error } = await supabase
      .from('salaries')
      .update(salary)
      .eq('id', salaryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating salary:', error);
      return null;
    }

    return data;
  },

  // Удалить зарплату
  async deleteSalary(salaryId: string): Promise<boolean> {
    const { error } = await supabase
      .from('salaries')
      .delete()
      .eq('id', salaryId);

    if (error) {
      console.error('Error deleting salary:', error);
      return false;
    }

    return true;
  },
};

// Сервис для работы с координациями
export const coordinationService = {
  // Получить все координации для зарплаты
  async getCoordinationPayments(salaryId: string): Promise<CoordinationPayment[]> {
    const { data, error } = await supabase
      .from('coordination_payments')
      .select('*')
      .eq('salary_id', salaryId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching coordination payments:', error);
      return [];
    }

    return data || [];
  },

  // Создать координацию
  async createCoordinationPayment(payment: Omit<CoordinationPayment, 'id' | 'created_at' | 'updated_at'>): Promise<CoordinationPayment | null> {
    const { data, error } = await supabase
      .from('coordination_payments')
      .insert(payment)
      .select()
      .single();

    if (error) {
      console.error('Error creating coordination payment:', error);
      return null;
    }

    return data;
  },

  // Обновить координацию
  async updateCoordinationPayment(paymentId: string, payment: Partial<Omit<CoordinationPayment, 'id' | 'created_at' | 'updated_at'>>): Promise<CoordinationPayment | null> {
    const { data, error } = await supabase
      .from('coordination_payments')
      .update(payment)
      .eq('id', paymentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating coordination payment:', error);
      return null;
    }

    return data;
  },

  // Удалить координацию
  async deleteCoordinationPayment(paymentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('coordination_payments')
      .delete()
      .eq('id', paymentId);

    if (error) {
      console.error('Error deleting coordination payment:', error);
      return false;
    }

    return true;
  },
};

// Сервис для работы с оплатами подрядчикам
export const contractorPaymentService = {
  // Получить все оплаты подрядчикам
  async getPayments(userId: string): Promise<ContractorPayment[]> {
    const { data, error } = await supabase
      .from('contractor_payments')
      .select('*')
      .eq('created_by', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching contractor payments:', error);
      return [];
    }

    return data || [];
  },

  // Создать оплату подрядчику
  async createPayment(payment: Omit<ContractorPayment, 'id' | 'created_at' | 'updated_at' | 'to_pay'>): Promise<ContractorPayment | null> {
    const { data, error } = await supabase
      .from('contractor_payments')
      .insert(payment)
      .select()
      .single();

    if (error) {
      console.error('Error creating contractor payment:', error);
      return null;
    }

    return data;
  },

  // Обновить оплату подрядчику
  async updatePayment(paymentId: string, payment: Partial<Omit<ContractorPayment, 'id' | 'created_at' | 'updated_at' | 'to_pay'>>): Promise<ContractorPayment | null> {
    const { data, error } = await supabase
      .from('contractor_payments')
      .update(payment)
      .eq('id', paymentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating contractor payment:', error);
      return null;
    }

    return data;
  },

  // Удалить оплату подрядчику
  async deletePayment(paymentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('contractor_payments')
      .delete()
      .eq('id', paymentId);

    if (error) {
      console.error('Error deleting contractor payment:', error);
      return false;
    }

    return true;
  },
};

