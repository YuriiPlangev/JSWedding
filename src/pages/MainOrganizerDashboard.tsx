import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { weddingService, taskService, documentService, clientService, presentationService } from '../services/weddingService';
import type { Wedding, Task, Document, User, Presentation } from '../types';
import { WeddingModal, TaskModal, DocumentModal, PresentationModal, ClientModal } from '../components/modals';
import { TasksPage, WeddingsList, WeddingDetails, AdvancesTab, SalariesTab, ContractorsPaymentsTab } from '../components/main-organizer';
import logoV3 from '../assets/logoV3.svg';

type ViewMode = 'weddings' | 'tasks' | 'wedding-details' | 'advances' | 'salaries' | 'contractors-payments';

interface SelectedWedding extends Wedding {
  client?: User;
  tasks?: Task[];
  documents?: Document[];
}

interface OpenTab {
  id: string;
  weddingId: string;
  name: string;
}

const MainOrganizerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [selectedWedding, setSelectedWedding] = useState<SelectedWedding | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Восстанавливаем viewMode из localStorage при загрузке
    try {
      const saved = localStorage.getItem('main_organizer_viewMode');
      if (saved && (saved === 'tasks' || saved === 'weddings' || saved === 'wedding-details' || saved === 'advances' || saved === 'salaries' || saved === 'contractors-payments')) {
        return saved as ViewMode;
      }
    } catch {
      // Игнорируем ошибки
    }
    return 'tasks';
  });
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_error, setError] = useState<string | null>(null);
  // Функции для работы с localStorage
  const saveTabsToStorage = (tabs: OpenTab[]) => {
    try {
      localStorage.setItem('main_organizer_openTabs', JSON.stringify(tabs));
    } catch (error) {
      console.error('Error saving tabs to localStorage:', error);
    }
  };

  const loadTabsFromStorage = (): OpenTab[] => {
    try {
      const saved = localStorage.getItem('main_organizer_openTabs');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading tabs from localStorage:', error);
    }
    return [];
  };

  const [openTabs, setOpenTabs] = useState<OpenTab[]>(loadTabsFromStorage());
  const [lastActiveTabId, setLastActiveTabId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('main_organizer_lastActiveTabId');
    } catch {
      return null;
    }
  });
  

  // Состояния для модальных окон
  const [showWeddingModal, setShowWeddingModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingWedding, setEditingWedding] = useState<Wedding | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [uploadingPresentation, setUploadingPresentation] = useState(false);
  
  // Состояния для drag and drop
  const [draggedWeddingTaskId, setDraggedWeddingTaskId] = useState<string | null>(null);
  const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const [weddingsData, clientsData] = await Promise.all([
        weddingService.getAllWeddings(), // Главный организатор видит все свадьбы
        clientService.getAllClients(),
      ]);

      setWeddings(weddingsData);
      setClients(clientsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // useEffect для загрузки данных при монтировании
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Используем ref для отслеживания, был ли уже загружен user.id
  const loadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user?.id && user.role === 'main_organizer') {
      // Загружаем данные только один раз при монтировании или при изменении user.id
      if (loadedUserIdRef.current !== user.id) {
        loadedUserIdRef.current = user.id;
        loadData();
      }
    } else if (user && user.role !== 'main_organizer') {
      // Если пользователь не главный организатор, перенаправляем
      // Но только если он не находится уже на правильной странице
      if (window.location.pathname !== '/dashboard' && window.location.pathname !== '/client' && window.location.pathname !== '/organizer') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user?.id, user?.role, navigate, loadData]);

  // Сохраняем viewMode в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem('main_organizer_viewMode', viewMode);
    } catch (error) {
      console.error('Error saving viewMode to localStorage:', error);
    }
  }, [viewMode]);

  // Восстанавливаем открытые вкладки после загрузки данных
  const hasRestoredTabsRef = useRef(false);
  useEffect(() => {
    // Восстанавливаем состояние только один раз после загрузки свадеб
    if (weddings.length > 0 && !selectedWedding && !hasRestoredTabsRef.current) {
      hasRestoredTabsRef.current = true;
      
      // Проверяем, какие вкладки все еще существуют (не были удалены)
      const validTabs = openTabs.filter(tab => 
        weddings.some(wedding => wedding.id === tab.weddingId)
      );

      // Если есть невалидные вкладки, обновляем список
      if (validTabs.length !== openTabs.length) {
        setOpenTabs(validTabs);
        saveTabsToStorage(validTabs);
      }

      // Приоритет 1: Восстанавливаем последнюю активную вкладку по lastActiveTabId
      if (lastActiveTabId) {
        const weddingExists = weddings.some(w => w.id === lastActiveTabId);
        if (weddingExists) {
          // Загружаем детали свадьбы напрямую, даже если нет открытых вкладок
          loadWeddingDetails(lastActiveTabId);
          return;
        }
      }

      // Приоритет 2: Если есть валидные вкладки, открываем первую
      if (validTabs.length > 0) {
        loadWeddingDetails(validTabs[0].weddingId);
        return;
      }

      // Приоритет 3: Если нет вкладок и нет lastActiveTabId, проверяем сохраненный viewMode
      const savedViewMode = localStorage.getItem('main_organizer_viewMode');
      if (savedViewMode && savedViewMode !== 'wedding-details') {
        // Если viewMode не 'wedding-details', просто устанавливаем его
        // (viewMode уже восстановлен из localStorage при инициализации, но на всякий случай)
        if (savedViewMode === 'tasks' || savedViewMode === 'weddings' || savedViewMode === 'advances' || savedViewMode === 'salaries') {
          setViewMode(savedViewMode as ViewMode);
        }
      } else if (savedViewMode === 'wedding-details' && !lastActiveTabId) {
        // Если viewMode был 'wedding-details', но нет lastActiveTabId, переключаемся на ивенты
        setViewMode('weddings');
      }
    }
  }, [weddings.length, lastActiveTabId, selectedWedding]);

  const loadWeddingDetails = async (weddingId: string) => {
    setLoading(true);
    try {
      const wedding = await weddingService.getWeddingById(weddingId);
      if (!wedding) {
        setError('Ошибка при загрузке данных');
        setLoading(false);
        return;
      }

      const client = await clientService.getClientById(wedding.client_id);
      const [tasks, documents] = await Promise.all([
        taskService.getWeddingTasks(weddingId),
        documentService.getWeddingDocuments(weddingId),
      ]);

      const weddingData = {
        ...wedding,
        client: client || undefined,
        tasks,
        documents,
      };

      setSelectedWedding(weddingData);

      // Добавляем вкладку, если её еще нет
      const coupleName = `${wedding.couple_name_1_ru || wedding.couple_name_1_en || ''} & ${wedding.couple_name_2_ru || wedding.couple_name_2_en || ''}`;

      setOpenTabs(prevTabs => {
        // Проверяем, есть ли уже такая вкладка
        if (prevTabs.some(tab => tab.weddingId === weddingId)) {
          const updatedTabs = prevTabs;
          saveTabsToStorage(updatedTabs);
          localStorage.setItem('main_organizer_lastActiveTabId', weddingId);
          setLastActiveTabId(weddingId);
          return updatedTabs;
        }
        // Добавляем новую вкладку
        const newTabs = [...prevTabs, {
          id: weddingId,
          weddingId: weddingId,
          name: coupleName,
        }];
        saveTabsToStorage(newTabs);
        localStorage.setItem('main_organizer_lastActiveTabId', weddingId);
        setLastActiveTabId(weddingId);
        return newTabs;
      });

      setViewMode('wedding-details');
      setLoading(false);
    } catch (err) {
      console.error('Error loading wedding details:', err);
      setError('Ошибка при загрузке данных');
      setLoading(false);
    }
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remainingTabs = openTabs.filter(tab => tab.id !== tabId);
    setOpenTabs(remainingTabs);
    saveTabsToStorage(remainingTabs);
    
    // Если закрываемая вкладка была активной, переключаемся на другую
    if (selectedWedding?.id === tabId) {
      if (remainingTabs.length > 0) {
        // Переключаемся на последнюю открытую вкладку
        const lastTab = remainingTabs[remainingTabs.length - 1];
        localStorage.setItem('main_organizer_lastActiveTabId', lastTab.weddingId);
        setLastActiveTabId(lastTab.weddingId);
        loadWeddingDetails(lastTab.weddingId);
      } else {
        // Если вкладок не осталось, переключаемся на ивенты
        setSelectedWedding(null);
        setViewMode('weddings');
        localStorage.removeItem('main_organizer_lastActiveTabId');
        setLastActiveTabId(null);
      }
    }
  };

  const handleTabClick = (tab: OpenTab) => {
    if (selectedWedding?.id !== tab.weddingId) {
      localStorage.setItem('main_organizer_lastActiveTabId', tab.weddingId);
      setLastActiveTabId(tab.weddingId);
      loadWeddingDetails(tab.weddingId);
    }
  };

  const handleCreateWedding = async () => {
    setEditingWedding(null);
    // Обновляем список клиентов перед открытием формы
    if (user?.id) {
      try {
        const clientsData = await clientService.getAllClients();
        setClients(clientsData);
      } catch (err) {
        console.error('Error loading clients:', err);
      }
    }
    setShowWeddingModal(true);
  };

  const handleEditWedding = async (wedding: Wedding) => {
    // Загружаем актуальные данные свадьбы из БД перед открытием модалки
    try {
      const updatedWedding = await weddingService.getWeddingById(wedding.id);
      if (updatedWedding) {
        setEditingWedding(updatedWedding);
      } else {
        setEditingWedding(wedding); // Fallback на переданные данные
      }
    } catch (err) {
      console.error('Error loading wedding for edit:', err);
      setEditingWedding(wedding); // Fallback на переданные данные
    }
    setShowWeddingModal(true);
  };

  // Функция удаления свадьбы (не используется, но может понадобиться в будущем)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleDeleteWedding = async (weddingId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот ивент?')) {
      return;
    }

    try {
      const success = await weddingService.deleteWedding(weddingId);
      if (success) {
        await loadData();
        // Удаляем вкладку из открытых (всегда, даже если она не активна)
        const remainingTabs = openTabs.filter(tab => tab.weddingId !== weddingId);
        setOpenTabs(remainingTabs);
        saveTabsToStorage(remainingTabs);
        if (selectedWedding?.id === weddingId) {
          setSelectedWedding(null);
          setViewMode('weddings');
          if (lastActiveTabId === weddingId) {
            localStorage.removeItem('main_organizer_lastActiveTabId');
            setLastActiveTabId(null);
          }
        }
      }
    } catch (err) {
      console.error('Error deleting wedding:', err);
    }
  };

  // Функция для создания стандартных документов при создании свадьбы
  const createDefaultDocuments = async (weddingId: string) => {
    // Убираем order из документов, так как колонка может не существовать в базе данных
    const defaultDocuments = [
      // Закрепленные документы
      {
        wedding_id: weddingId,
        name: 'Бюджет',
        name_en: 'Estimate',
        name_ru: 'Бюджет',
        name_ua: 'Кошторис',
        pinned: true,
      },
      {
        wedding_id: weddingId,
        name: 'Тайминг',
        name_en: 'Timing plan',
        name_ru: 'Тайминг',
        name_ua: 'Таймінг',
        pinned: true,
      },
      {
        wedding_id: weddingId,
        name: 'Этапы подготовки свадьбы',
        name_en: 'Stages of wedding preparation',
        name_ru: 'Этапы подготовки свадьбы',
        name_ua: 'Етапи підготовки весілля',
        pinned: true,
      },
      // Незакрепленные документы
      {
        wedding_id: weddingId,
        name: 'Список гостей',
        name_en: 'Guest list',
        name_ru: 'Список гостей',
        name_ua: 'Список гостей',
        pinned: false,
      },
      {
        wedding_id: weddingId,
        name: 'Договор & JS',
        name_en: 'Agreement & JS',
        name_ru: 'Договор & JS',
        name_ua: 'Договір & JS',
        pinned: false,
      },
      {
        wedding_id: weddingId,
        name: 'Тайминг утра невесты',
        name_en: "Bride's morning timing plan",
        name_ru: 'Тайминг утра невесты',
        name_ua: 'Таймінг ранку нареченої',
        pinned: false,
      },
      {
        wedding_id: weddingId,
        name: 'Проживание гостей и специалистов',
        name_en: 'Accommodation of guests and specialists',
        name_ru: 'Проживание гостей и специалистов',
        name_ua: 'Проживання гостей та спеціалістів',
        pinned: false,
      },
      {
        wedding_id: weddingId,
        name: 'План рассадки',
        name_en: 'Seating plan',
        name_ru: 'План рассадки',
        name_ua: 'План розсадки',
        pinned: false,
      },
      {
        wedding_id: weddingId,
        name: 'Меню',
        name_en: 'Menu',
        name_ru: 'Меню',
        name_ua: 'Меню',
        pinned: false,
      },
      {
        wedding_id: weddingId,
        name: 'Алкоголь',
        name_en: 'Alcohol list',
        name_ru: 'Алкоголь',
        name_ua: 'Алкоголь',
        pinned: false,
      },
    ];

    // Создаем все документы параллельно
    const createPromises = defaultDocuments.map((doc) =>
      documentService.createDocument(doc)
    );

    try {
      await Promise.all(createPromises);
      console.log('Default documents created successfully');
    } catch (error) {
      console.error('Error creating default documents:', error);
      // Не прерываем процесс, если документы не создались
    }
  };

  const handleSaveWedding = async (weddingData: Omit<Wedding, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) return;

    try {
      if (editingWedding) {
        console.log('Updating wedding:', editingWedding.id);
        console.log('Update data:', weddingData);
        const result = await weddingService.updateWedding(editingWedding.id, weddingData);
        if (!result) {
          setError('Не удалось обновить свадьбу. Проверьте консоль для деталей.');
          return;
        }

        // Обновляем название вкладки, если свадьба открыта
        const coupleName = `${weddingData.couple_name_1_ru || weddingData.couple_name_1_en || ''} & ${weddingData.couple_name_2_ru || weddingData.couple_name_2_en || ''}`;

        setOpenTabs(prevTabs => {
          const updatedTabs = prevTabs.map(tab => 
            tab.weddingId === editingWedding.id 
              ? { ...tab, name: coupleName }
              : tab
          );
          saveTabsToStorage(updatedTabs);
          return updatedTabs;
        });

        // Если редактируемая свадьба сейчас открыта, обновляем её данные
        if (selectedWedding?.id === editingWedding.id) {
          await loadWeddingDetails(editingWedding.id);
        }
      } else {
        const newWedding = await weddingService.createWedding({
          ...weddingData,
          organizer_id: user.id,
        });
        
        // После успешного создания свадьбы создаем стандартные документы
        if (newWedding?.id) {
          await createDefaultDocuments(newWedding.id);
        }
      }

      setShowWeddingModal(false);
      setEditingWedding(null);
      await loadData();
    } catch (err) {
      console.error('Error saving wedding:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении свадьбы');
    }
  };

  const handleCreateClient = () => {
    setShowClientModal(true);
  };

  const handleSaveClient = async (clientData: { email: string; password: string }) => {
    try {
      await clientService.createClient(clientData.email, clientData.password);
      await loadData();
      setShowClientModal(false);
    } catch (err) {
      console.error('Error creating client:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при создании клиента');
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'wedding_id'>) => {
    if (!selectedWedding) return;

    try {
      // Подготавливаем данные для сохранения
      const taskToSave: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
        wedding_id: selectedWedding.id,
        organizer_id: null, // Для заданий свадьбы organizer_id будет null
        task_group_id: null, // Для заданий свадьбы task_group_id будет null
        title: taskData.title.trim(),
        status: taskData.status,
        ...(taskData.title_en?.trim() && { title_en: taskData.title_en.trim() }),
        ...(taskData.title_ru?.trim() && { title_ru: taskData.title_ru.trim() }),
        ...(taskData.title_ua?.trim() && { title_ua: taskData.title_ua.trim() }),
        ...(taskData.due_date && taskData.due_date.trim() && { due_date: taskData.due_date }),
        ...(taskData.link && taskData.link.trim() && { link: taskData.link.trim() }),
        ...(taskData.link_text && taskData.link_text.trim() && { link_text: taskData.link_text.trim() }),
        ...(taskData.link_text_en?.trim() && { link_text_en: taskData.link_text_en.trim() }),
        ...(taskData.link_text_ru?.trim() && { link_text_ru: taskData.link_text_ru.trim() }),
        ...(taskData.link_text_ua?.trim() && { link_text_ua: taskData.link_text_ua.trim() }),
      };

      if (editingTask) {
        const result = await taskService.updateTask(editingTask.id, taskToSave, selectedWedding.id);
        if (!result) {
          setError('Не удалось обновить задание');
          return;
        }
      } else {
        // При создании нового задания устанавливаем порядок в конец списка (если колонка order существует)
        const existingTasks = selectedWedding.tasks || [];
        const hasOrderColumn = existingTasks.some(task => task.order !== null && task.order !== undefined);
        if (hasOrderColumn) {
          const maxOrder = existingTasks.reduce((max, task) => {
            const order = task.order ?? -1;
            return order > max ? order : max;
          }, -1);
          taskToSave.order = maxOrder + 1;
        }
        // Если колонки order нет, просто не устанавливаем её
        
        const result = await taskService.createTask(taskToSave);
        if (!result) {
          setError('Не удалось создать задание');
          return;
        }
      }

      setShowTaskModal(false);
      setEditingTask(null);
      await loadWeddingDetails(selectedWedding.id);
    } catch (err) {
      console.error('Error saving task:', err);
      setError('Ошибка при сохранении задания');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedWedding) return;

    if (!confirm('Вы уверены, что хотите удалить это задание?')) {
      return;
    }

    try {
      const success = await taskService.deleteTask(taskId, selectedWedding.id);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
      } else {
        setError('Не удалось удалить задание');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Ошибка при удалении задания');
    }
  };

  // Обработчики drag and drop для заданий
  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedWeddingTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', taskId);
    
    // Создаем клон элемента для непрозрачного drag изображения
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clone = target.cloneNode(true) as HTMLElement;
    
    // Устанавливаем стили для клона
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '0';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.opacity = '1';
    clone.style.pointerEvents = 'none';
    
    document.body.appendChild(clone);
    
    // Вычисляем смещение относительно позиции мыши
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    // Устанавливаем клон как drag image
    e.dataTransfer.setDragImage(clone, offsetX, offsetY);
    
    // Удаляем клон после небольшой задержки
    requestAnimationFrame(() => {
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    });
  };

  const handleTaskDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTaskDrop = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!selectedWedding || !draggedWeddingTaskId || draggedWeddingTaskId === targetTaskId) {
      setDraggedWeddingTaskId(null);
      return;
    }

    const tasks = selectedWedding.tasks || [];
    const draggedIndex = tasks.findIndex(t => t.id === draggedWeddingTaskId);
    const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedWeddingTaskId(null);
      return;
    }

    // Создаем новый массив с обновленным порядком
    const newTasks = [...tasks];
    const [draggedTask] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, draggedTask);

    // Обновляем порядок для всех заданий
    const taskOrders = newTasks.map((task, index) => ({
      id: task.id,
      order: index,
    }));

    try {
      const success = await taskService.updateTasksOrder(selectedWedding.id, taskOrders);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
      } else {
        setError('Не удалось обновить порядок заданий');
      }
    } catch (err) {
      console.error('Error updating tasks order:', err);
      setError('Ошибка при обновлении порядка заданий');
    }

    setDraggedWeddingTaskId(null);
  };

  const handleTaskDragEnd = () => {
    setDraggedWeddingTaskId(null);
  };

  // Обработчики drag and drop для документов
  const handleDocumentDragStart = (e: React.DragEvent, documentId: string) => {
    setDraggedDocumentId(documentId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', documentId);
  };

  const handleDocumentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDocumentDrop = async (e: React.DragEvent, targetDocumentId: string) => {
    e.preventDefault();
    if (!selectedWedding || !draggedDocumentId || draggedDocumentId === targetDocumentId) {
      setDraggedDocumentId(null);
      return;
    }

    const documents = selectedWedding.documents || [];
    const draggedDoc = documents.find(d => d.id === draggedDocumentId);
    const targetDoc = documents.find(d => d.id === targetDocumentId);

    if (!draggedDoc || !targetDoc) {
      setDraggedDocumentId(null);
      return;
    }

    // Разделяем документы на закрепленные и незакрепленные
    const pinnedDocs = documents.filter(d => d.pinned);
    const unpinnedDocs = documents.filter(d => !d.pinned);

    // Если перетаскиваем закрепленный документ, работаем только с закрепленными
    // Если перетаскиваем незакрепленный, работаем только с незакрепленными
    let targetArray: Document[];
    let draggedIndex: number;
    let targetIndex: number;

    if (draggedDoc.pinned) {
      targetArray = pinnedDocs;
      draggedIndex = pinnedDocs.findIndex(d => d.id === draggedDocumentId);
      targetIndex = pinnedDocs.findIndex(d => d.id === targetDocumentId);
    } else {
      targetArray = unpinnedDocs;
      draggedIndex = unpinnedDocs.findIndex(d => d.id === draggedDocumentId);
      targetIndex = unpinnedDocs.findIndex(d => d.id === targetDocumentId);
    }

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedDocumentId(null);
      return;
    }

    // Создаем новый массив с обновленным порядком
    const newArray = [...targetArray];
    const [draggedItem] = newArray.splice(draggedIndex, 1);
    newArray.splice(targetIndex, 0, draggedItem);

    // Обновляем порядок для всех документов в этой группе
    const documentOrders = newArray.map((doc, index) => ({
      id: doc.id,
      order: index,
    }));

    try {
      const success = await documentService.updateDocumentsOrder(selectedWedding.id, documentOrders);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
      } else {
        setError('Не удалось обновить порядок документов');
      }
    } catch (err) {
      console.error('Error updating documents order:', err);
      setError('Ошибка при обновлении порядка документов');
    }

    setDraggedDocumentId(null);
  };

  const handleDocumentDragEnd = () => {
    setDraggedDocumentId(null);
  };

  const handleCreateDocument = () => {
    setEditingDocument(null);
    setShowDocumentModal(true);
  };

  const handleDeleteDocument = async (document: Document) => {
    if (!selectedWedding) return;

    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      const success = await documentService.deleteDocument(
        document.id,
        undefined, // file_path больше не используется
        selectedWedding.id
      );
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
      } else {
        setError('Не удалось удалить документ');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Ошибка при удалении документа');
    }
  };

  // Обработчики для презентации
  const handleDeletePresentation = async () => {
    if (!selectedWedding) return;

    if (!confirm('Вы уверены, что хотите удалить эту презентацию?')) {
      return;
    }

    try {
      const success = await presentationService.deletePresentation(selectedWedding.id);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
      } else {
        setError('Не удалось удалить презентацию');
      }
    } catch (err) {
      console.error('Error deleting presentation:', err);
      setError('Ошибка при удалении презентации');
    }
  };

  const handleUploadPresentation = async (files: FileList | null) => {
    if (!selectedWedding || !files || files.length === 0) return;

    setUploadingPresentation(true);
    try {
      const defaultPresentation = presentationService.getDefaultCompanyPresentation();
      const sections: Presentation['sections'] = [];

      // Загружаем изображения для каждой секции
      for (let i = 0; i < Math.min(files.length, defaultPresentation.sections.length); i++) {
        const file = files[i];
        const imageUrl = await presentationService.uploadPresentationImage(
          selectedWedding.id,
          file,
          i
        );

        if (imageUrl) {
          sections.push({
            id: i,
            name: defaultPresentation.sections[i].name,
            image_url: imageUrl,
          });
        }
      }

      // Если загружено меньше файлов, чем секций, заполняем остальные пустыми
      for (let i = files.length; i < defaultPresentation.sections.length; i++) {
        sections.push({
          id: i,
          name: defaultPresentation.sections[i].name,
          image_url: '',
        });
      }

      // Формируем название презентации
      const coupleName1 = selectedWedding.couple_name_1_ru || selectedWedding.couple_name_1_en || '';
      const coupleName2 = selectedWedding.couple_name_2_ru || selectedWedding.couple_name_2_en || '';
      
      const presentation: Presentation = {
        type: 'wedding',
        title: `Презентация свадьбы: ${coupleName1} & ${coupleName2}`,
        sections,
      };

      const success = await presentationService.updatePresentation(selectedWedding.id, presentation);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
        setShowPresentationModal(false);
      } else {
        setError('Ошибка при загрузке данных');
      }
    } catch (err) {
      console.error('Error uploading presentation:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setUploadingPresentation(false);
    }
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setShowDocumentModal(true);
  };

  const handleSaveDocument = async (
    docData: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'>
  ) => {
    if (!selectedWedding) return;

    try {
      let result: Document | null = null;
      
      if (editingDocument) {
        result = await documentService.updateDocument(editingDocument.id, docData, selectedWedding.id);
      } else {
        // При создании нового документа устанавливаем порядок в конец соответствующей группы (если колонка order существует)
        const existingDocuments = selectedWedding.documents || [];
        const hasOrderColumn = existingDocuments.some(doc => doc.order !== null && doc.order !== undefined);
        if (hasOrderColumn) {
          const isPinned = docData.pinned === true;
          const sameGroupDocs = existingDocuments.filter(d => d.pinned === isPinned);
          const maxOrder = sameGroupDocs.reduce((max, doc) => {
            const order = doc.order ?? -1;
            return order > max ? order : max;
          }, -1);
          docData.order = maxOrder + 1;
        }
        // Если колонки order нет, просто не устанавливаем её
        
        result = await documentService.createDocument(docData);
      }

      if (!result) {
        setError('Ошибка при сохранении документа');
        return;
      }

      setShowDocumentModal(false);
      setEditingDocument(null);
      await loadWeddingDetails(selectedWedding.id);
    } catch (err) {
      console.error('Error saving document:', err);
      setError('Ошибка при сохранении документа');
    }
  };

  if (loading && weddings.length === 0) {
    return (
      <div className="min-h-screen bg-[#eae6db] flex items-center justify-center">
        <div className="text-black font-forum">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#eae6db] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-[#eae6db] border-b border-[#00000033] flex-shrink-0">
        <div className="px-3 sm:px-4 md:px-8 lg:px-12 xl:px-[60px] py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <img 
                src={logoV3} 
                alt="logo" 
                className="h-10 sm:h-12 md:h-14 lg:h-12 max-[1599px]:lg:h-11 min-[1600px]:lg:h-14 w-auto flex-shrink-0"
                style={{ display: 'block' }}
              />
              <div>
                <h1 className="text-[24px] sm:text-[28px] md:text-[32px] lg:text-[36px] max-[1599px]:text-[28px] lg:max-[1599px]:text-[26px] min-[1300px]:max-[1599px]:text-[30px] font-forum leading-tight text-black">Панель главного организатора</h1>
                <p className="text-[14px] sm:text-[16px] md:text-[18px] max-[1599px]:text-[16px] lg:max-[1599px]:text-[15px] min-[1300px]:max-[1599px]:text-[16px] font-forum font-light text-[#00000080] leading-tight mt-1">Добро пожаловать, {user?.name}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-[14px] sm:text-[16px] md:text-[18px] max-[1599px]:text-[16px] font-forum text-[#00000080] hover:text-black transition-colors cursor-pointer border border-[#00000033] rounded-lg hover:bg-white w-full sm:w-auto"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-[#eae6db] border-b border-[#00000033] flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2 px-3 sm:px-4 md:px-8 lg:px-12 xl:px-[60px] py-2">
          <button
            onClick={() => {
              setViewMode('tasks');
              setSelectedWedding(null);
            }}
            className={`px-3 sm:px-4 py-2 text-[14px] sm:text-[16px] max-[1599px]:text-[14px] font-forum rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'tasks'
                ? 'bg-black text-white'
                : 'bg-white text-[#00000080] hover:text-black border border-[#00000033]'
            }`}
          >
            Задания
          </button>
          <button
            onClick={() => {
              setViewMode('weddings');
              setSelectedWedding(null);
            }}
            className={`px-3 sm:px-4 py-2 text-[14px] sm:text-[16px] max-[1599px]:text-[14px] font-forum rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'weddings'
                ? 'bg-black text-white'
                : 'bg-white text-[#00000080] hover:text-black border border-[#00000033]'
            }`}
          >
            Ивенты
          </button>
          {openTabs.map(tab => {
            const wedding = weddings.find(w => w.id === tab.weddingId);
            if (!wedding) return null;
            
            return (
              <div
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-[14px] sm:text-[16px] max-[1599px]:text-[14px] font-forum rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  selectedWedding?.id === tab.weddingId
                    ? 'bg-black text-white'
                    : 'bg-white text-[#00000080] hover:text-black border border-[#00000033]'
                }`}
              >
                <span>{tab.name}</span>
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="ml-1 hover:bg-[#00000020] rounded px-1"
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            onClick={() => {
              setViewMode('advances');
              setSelectedWedding(null);
            }}
            className={`px-3 sm:px-4 py-2 text-[14px] sm:text-[16px] max-[1599px]:text-[14px] font-forum rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'advances'
                ? 'bg-black text-white'
                : 'bg-white text-[#00000080] hover:text-black border border-[#00000033]'
            }`}
          >
            Авансы
          </button>
          <button
            onClick={() => {
              setViewMode('salaries');
              setSelectedWedding(null);
            }}
            className={`px-3 sm:px-4 py-2 text-[14px] sm:text-[16px] max-[1599px]:text-[14px] font-forum rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'salaries'
                ? 'bg-black text-white'
                : 'bg-white text-[#00000080] hover:text-black border border-[#00000033]'
            }`}
          >
            Зарплаты
          </button>
          <button
            onClick={() => {
              setViewMode('contractors-payments');
              setSelectedWedding(null);
            }}
            className={`px-3 sm:px-4 py-2 text-[14px] sm:text-[16px] max-[1599px]:text-[14px] font-forum rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              viewMode === 'contractors-payments'
                ? 'bg-black text-white'
                : 'bg-white text-[#00000080] hover:text-black border border-[#00000033]'
            }`}
          >
            Оплаты подрядчикам
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-2">
        {viewMode === 'tasks' && (
          <TasksPage user={user} viewMode={viewMode} />
        )}

        {viewMode === 'weddings' && (
          <WeddingsList
            weddings={weddings}
            onWeddingClick={(weddingId: string) => loadWeddingDetails(weddingId)}
            onEditWedding={(wedding: Wedding) => handleEditWedding(wedding)}
            onCreateClient={handleCreateClient}
            onCreateWedding={handleCreateWedding}
          />
        )}

        {viewMode === 'wedding-details' && selectedWedding && (
          <WeddingDetails
            selectedWedding={selectedWedding}
            draggedDocumentId={draggedDocumentId}
            onBack={() => {
              setViewMode('weddings');
              setSelectedWedding(null);
            }}
            onEditWedding={(wedding) => handleEditWedding(wedding as Wedding)}
            onCreateTask={handleCreateTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragOver={handleTaskDragOver}
            onTaskDrop={handleTaskDrop}
            onTaskDragEnd={handleTaskDragEnd}
            onCreateDocument={handleCreateDocument}
            onEditDocument={handleEditDocument}
            onDeleteDocument={handleDeleteDocument}
            onDocumentDragStart={handleDocumentDragStart}
            onDocumentDragOver={handleDocumentDragOver}
            onDocumentDrop={handleDocumentDrop}
            onDocumentDragEnd={handleDocumentDragEnd}
            onDeletePresentation={handleDeletePresentation}
            onOpenPresentationModal={() => setShowPresentationModal(true)}
          />
        )}

        {viewMode === 'advances' && <AdvancesTab />}

        {viewMode === 'salaries' && <SalariesTab />}
        {viewMode === 'contractors-payments' && <ContractorsPaymentsTab />}
      </main>

      {/* Modals */}
      {showWeddingModal && (
        <WeddingModal
          wedding={editingWedding}
          clients={clients}
          onClose={() => {
            setShowWeddingModal(false);
            setEditingWedding(null);
          }}
          onSave={handleSaveWedding}
        />
      )}

      {showTaskModal && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
        />
      )}

      {showDocumentModal && selectedWedding && (
        <DocumentModal
          document={editingDocument}
          weddingId={selectedWedding.id}
          onClose={() => {
            setShowDocumentModal(false);
            setEditingDocument(null);
          }}
          onSave={handleSaveDocument}
        />
      )}

      {showPresentationModal && (
        <PresentationModal
          uploading={uploadingPresentation}
          onClose={() => setShowPresentationModal(false)}
          onUpload={handleUploadPresentation}
        />
      )}

      {showClientModal && (
        <ClientModal
          onClose={() => setShowClientModal(false)}
          onSave={handleSaveClient}
        />
      )}
    </div>
  );
};

export default MainOrganizerDashboard;
