import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { weddingService, taskService, documentService, clientService, presentationService } from '../services/weddingService';
import type { Wedding, Task, TaskGroup, Document, User, Presentation } from '../types';
import { WeddingModal, TaskModal, OrganizerTaskModal, DocumentModal, PresentationModal, ClientModal } from '../components/modals';
import { TaskColumn, ScrollbarStyles } from '../components/organizer';
import { useTaskGroups, useTaskLogs, useTaskDragAndDrop, useGroupDragAndDrop } from '../hooks';
import { hexToHsl, hslToHex } from '../utils/colorUtils';
import { splitTasksByStatus } from '../utils/taskUtils';
import logoV3 from '../assets/logoV3.svg';

type ViewMode = 'weddings' | 'tasks' | 'wedding-details';

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

const OrganizerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [selectedWedding, setSelectedWedding] = useState<SelectedWedding | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Восстанавливаем viewMode из localStorage при загрузке
    try {
      const saved = localStorage.getItem('organizer_viewMode');
      if (saved && (saved === 'tasks' || saved === 'weddings' || saved === 'wedding-details')) {
        return saved as ViewMode;
      }
    } catch {
      // Игнорируем ошибки
    }
    return 'tasks';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Функции для работы с localStorage
  const saveTabsToStorage = (tabs: OpenTab[]) => {
    try {
      localStorage.setItem('organizer_openTabs', JSON.stringify(tabs));
    } catch (error) {
      console.error('Error saving tabs to localStorage:', error);
    }
  };

  const loadTabsFromStorage = (): OpenTab[] => {
    try {
      const saved = localStorage.getItem('organizer_openTabs');
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
      return localStorage.getItem('organizer_lastActiveTabId');
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
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null);

  // Компонент страницы заданий
  const TasksPage = ({ user, viewMode }: { user: User | null; viewMode: string }) => {
    // Используем кастомные хуки
    const { taskGroups, loadingTasks, loadOrganizerTasks, setTaskGroups } = useTaskGroups(user?.id || null);
    
    // Обновляем данные при переключении на вкладку "Задания"
    useEffect(() => {
      if (viewMode === 'tasks' && user?.id) {
        // Обновляем данные без показа индикатора загрузки, если данные уже есть
        loadOrganizerTasks(true, false);
      }
    }, [viewMode, user?.id, loadOrganizerTasks]);
    const { taskLogs, loadingLogs, expandedTaskLogs, toggleTaskLogs } = useTaskLogs();
    const {
      draggedTaskId,
      handleTaskDragStart,
      handleTaskDragOver,
      handleTaskDragEnd,
      handleTaskDropOnGroup,
    } = useTaskDragAndDrop({
      setTaskGroups,
      loadOrganizerTasks,
    });
    const {
      draggedGroupId,
      handleGroupDragStart,
      handleGroupDragOver,
      handleGroupDragEnd,
      handleGroupDrop,
    } = useGroupDragAndDrop({
      taskGroups,
      setTaskGroups,
      loadOrganizerTasks,
    });

    const [showOrganizerTaskModal, setShowOrganizerTaskModal] = useState(false);
    const [showTaskGroupModal, setShowTaskGroupModal] = useState(false);
    const [editingOrganizerTask, setEditingOrganizerTask] = useState<Task | null>(null);
    const [editingTaskGroup, setEditingTaskGroup] = useState<TaskGroup | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [showGroupMenu, setShowGroupMenu] = useState<string | null>(null);
    
    // Состояния для раскрытия/сворачивания секций "Выполнено"
    const [expandedCompletedSections, setExpandedCompletedSections] = useState<Set<string>>(new Set());
    
    // Состояния для inline создания задач
    const [creatingTaskGroupId, setCreatingTaskGroupId] = useState<string | null>(null);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const newTaskInputRef = useRef<HTMLInputElement | null>(null);
    
    // Состояния для inline редактирования задания
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingTaskText, setEditingTaskText] = useState<string>('');

    // Состояния для цветового пикера
    const [colorPickerHue, setColorPickerHue] = useState(0);
    const [colorPickerSaturation, setColorPickerSaturation] = useState(0);
    const [colorPickerLightness, setColorPickerLightness] = useState(100);

    // Инициализация цветового пикера при открытии модала
    useEffect(() => {
      if (showTaskGroupModal && editingTaskGroup) {
        const initialColor = editingTaskGroup.color || '#ffffff';
        const initialHsl = hexToHsl(initialColor);
        setColorPickerHue(initialHsl.h);
        setColorPickerSaturation(initialHsl.s);
        setColorPickerLightness(initialHsl.l);
      } else if (showTaskGroupModal && !editingTaskGroup) {
        // Сброс на белый при создании нового блока
        setColorPickerHue(0);
        setColorPickerSaturation(0);
        setColorPickerLightness(100);
      }
    }, [showTaskGroupModal, editingTaskGroup]);

    const handleCreateGroup = () => {
      setEditingTaskGroup(null);
      setShowTaskGroupModal(true);
    };

    const handleEditGroup = (group: TaskGroup) => {
      setEditingTaskGroup(group);
      setShowTaskGroupModal(true);
    };

    const handleSaveGroup = async (groupData: Omit<TaskGroup, 'id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) return;

      try {
        if (editingTaskGroup) {
          // Оптимистичное обновление: сразу обновляем цвет в локальном состоянии
          setTaskGroups(prevGroups => 
            prevGroups.map(({ group, tasks, isUnsorted }) => {
              if (group && group.id === editingTaskGroup.id) {
                return { group: { ...group, ...groupData }, tasks, isUnsorted };
              }
              return { group, tasks, isUnsorted };
            })
          );

          const result = await taskService.updateTaskGroup(editingTaskGroup.id, groupData);
          if (!result) {
            // Если сохранение не удалось, откатываем изменения
            await loadOrganizerTasks();
            setError('Не удалось обновить блок заданий');
            return;
          }

          // После успешного сохранения обновляем локальное состояние данными с сервера
          // Это гарантирует, что мы используем актуальные данные из БД
          setTaskGroups(prevGroups => 
            prevGroups.map(({ group, tasks, isUnsorted }) => {
              if (group && group.id === editingTaskGroup.id && result) {
                return { group: result, tasks, isUnsorted };
              }
              return { group, tasks, isUnsorted };
            })
          );
        } else {
          const result = await taskService.createTaskGroup({
            ...groupData,
            organizer_id: user.id,
          });
          if (!result) {
            setError('Не удалось создать блок заданий');
            return;
          }
          // Для нового блока нужно перезагрузить данные, чтобы получить ID
          await loadOrganizerTasks();
        }

        setShowTaskGroupModal(false);
        setEditingTaskGroup(null);
      } catch (err) {
        console.error('Error saving task group:', err);
        // При ошибке перезагружаем данные для отката изменений
        await loadOrganizerTasks();
        setError('Ошибка при сохранении блока заданий');
      }
    };

    const handleDeleteGroup = async (groupId: string) => {
      if (!confirm('Вы уверены, что хотите удалить этот блок заданий? Все задания в нем также будут удалены.')) {
        return;
      }

      try {
        const success = await taskService.deleteTaskGroup(groupId);
        if (success) {
          await loadOrganizerTasks();
        } else {
          setError('Не удалось удалить блок заданий');
        }
      } catch (err) {
        console.error('Error deleting task group:', err);
        setError('Ошибка при удалении блока заданий');
      }
    };


    const handleCreateTask = (groupId: string) => {
      setCreatingTaskGroupId(groupId);
      setNewTaskText('');
      // Фокус на input будет установлен через useEffect
    };

    const handleEditTask = (task: Task) => {
      setEditingTaskId(task.id);
      setEditingTaskText(task.title_ru || task.title || task.title_en || task.title_ua || '');
    };

    const handleSaveInlineEditTask = async (taskId: string) => {
      if (!user?.id || !editingTaskText.trim()) return;
      
      const group = taskGroups.find(g => g.tasks.some(t => t.id === taskId));
      const task = group?.tasks.find(t => t.id === taskId);
      if (!task) return;

      try {
        const taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'wedding_id' | 'organizer_id' | 'task_group_id'> = {
          title: editingTaskText.trim(),
          title_ru: editingTaskText.trim(),
          status: task.status,
          ...(task.title_en && { title_en: task.title_en }),
          ...(task.title_ua && { title_ua: task.title_ua }),
        };

        const result = await taskService.updateOrganizerTask(taskId, taskData);
        if (!result) {
          setError('Не удалось обновить задание');
          return;
        }

        setEditingTaskId(null);
        setEditingTaskText('');
        await loadOrganizerTasks();
      } catch (err) {
        console.error('Error updating task:', err);
        setError('Ошибка при обновлении задания');
      }
    };

    const handleCancelInlineEditTask = () => {
      setEditingTaskId(null);
      setEditingTaskText('');
    };

    const handleDeleteTask = async (taskId: string) => {
      if (!confirm('Вы уверены, что хотите удалить это задание?')) {
        return;
      }

      // Находим задание для сохранения его данных на случай отката
      const groupWithTask = taskGroups.find(g => g.tasks.some(t => t.id === taskId));
      const taskToDelete = groupWithTask?.tasks.find(t => t.id === taskId);
      
      if (!taskToDelete || !groupWithTask) return;

      const groupId = groupWithTask.group?.id || null;

      // Оптимистичное обновление - удаляем задание из локального состояния сразу
      setTaskGroups(prevGroups =>
        prevGroups.map(({ group, tasks, isUnsorted }) => {
          const currentGroupId = group?.id || null;
          const isCurrentUnsorted = isUnsorted || false;
          const sourceIsUnsorted = groupWithTask.isUnsorted || false;
          if ((groupId === null && isCurrentUnsorted && sourceIsUnsorted) || currentGroupId === groupId) {
            return { group, tasks: tasks.filter(t => t.id !== taskId), isUnsorted };
          }
          return { group, tasks, isUnsorted };
        })
      );

      // Закрываем режим редактирования, если оно было открыто
      setEditingTaskId(null);
      setEditingTaskText('');

      try {
        const success = await taskService.deleteOrganizerTask(taskId);
        if (!success) {
          // В случае ошибки возвращаем задание обратно
          setTaskGroups(prevGroups =>
            prevGroups.map(({ group, tasks, isUnsorted }) => {
              const currentGroupId = group?.id || null;
              const isCurrentUnsorted = isUnsorted || false;
              const sourceIsUnsorted = groupWithTask.isUnsorted || false;
              if ((groupId === null && isCurrentUnsorted && sourceIsUnsorted) || currentGroupId === groupId) {
                return { 
                  group, 
                  tasks: [...tasks, taskToDelete].sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  ),
                  isUnsorted
                };
              }
              return { group, tasks, isUnsorted };
            })
          );
          setError('Не удалось удалить задание');
        }
        // При успехе задание уже удалено из UI через оптимистичное обновление
        // Не перезагружаем данные, чтобы не было мерцания
      } catch (err) {
        console.error('Error deleting task:', err);
        // Возвращаем задание обратно при ошибке
        setTaskGroups(prevGroups =>
          prevGroups.map(({ group, tasks, isUnsorted }) => {
            const currentGroupId = group?.id || null;
            const isCurrentUnsorted = isUnsorted || false;
            if ((groupId === null && isCurrentUnsorted) || currentGroupId === groupId) {
              return { 
                group, 
                tasks: [...tasks, taskToDelete].sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                ),
                isUnsorted
              };
            }
            return { group, tasks, isUnsorted };
          })
        );
        setError('Ошибка при удалении задания');
      }
    };

    const handleSaveTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'wedding_id' | 'organizer_id' | 'task_group_id'>) => {
      if (!user?.id || !selectedGroupId) return;

      try {
        if (editingOrganizerTask) {
          const result = await taskService.updateOrganizerTask(editingOrganizerTask.id, taskData);
          if (!result) {
            setError('Не удалось обновить задание');
            return;
          }
        } else {
          const result = await taskService.createOrganizerTask({
            ...taskData,
            organizer_id: user.id,
            task_group_id: selectedGroupId,
          });
          if (!result) {
            setError('Не удалось создать задание');
            return;
          }
        }

        setShowOrganizerTaskModal(false);
        setEditingOrganizerTask(null);
        setSelectedGroupId(null);
        await loadOrganizerTasks();
      } catch (err) {
        console.error('Error saving task:', err);
        setError('Ошибка при сохранении задания');
      }
    };

    // Функция для сохранения inline задачи
    const handleSaveInlineTask = async (groupId: string | null, e?: React.MouseEvent | React.KeyboardEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      if (!user?.id || !newTaskText.trim() || !groupId) return;

      const taskText = newTaskText.trim();
      
      // Оптимистичное обновление: сразу добавляем задачу в UI
      const optimisticTask: Task = {
        id: `temp-${Date.now()}`, // Временный ID
        wedding_id: null,
        organizer_id: user.id,
        task_group_id: groupId,
        title: taskText,
        title_ru: taskText,
        status: 'pending',
        priority: newTaskPriority,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Сразу обновляем локальное состояние
      setTaskGroups(prevGroups =>
        prevGroups.map(({ group, tasks, isUnsorted }) => {
          const currentGroupId = group?.id || null;
          if (currentGroupId === groupId) {
            return { group, tasks: [...tasks, optimisticTask], isUnsorted };
          }
          return { group, tasks, isUnsorted };
        })
      );

      // Очищаем текст и оставляем input открытым для следующей задачи
      setNewTaskText('');
      
      // Возвращаем фокус на input сразу
      setTimeout(() => {
        if (creatingTaskGroupId === groupId && newTaskInputRef.current) {
          newTaskInputRef.current.focus();
        }
      }, 0);

      // Сохраняем на сервере в фоне
      try {
        const result = await taskService.createOrganizerTask({
          title: taskText,
          title_ru: taskText,
          status: 'pending',
          priority: newTaskPriority,
          organizer_id: user.id,
          task_group_id: groupId,
        });

        if (!result) {
          // Если сохранение не удалось, удаляем оптимистично добавленную задачу
          setTaskGroups(prevGroups =>
            prevGroups.map(({ group, tasks, isUnsorted }) => {
              const currentGroupId = group?.id || null;
              if (currentGroupId === groupId) {
                return { group, tasks: tasks.filter(t => t.id !== optimisticTask.id), isUnsorted };
              }
              return { group, tasks, isUnsorted };
            })
          );
          setError('Не удалось создать задание');
          return;
        }

        // Заменяем временную задачу на реальную с сервера
        setTaskGroups(prevGroups =>
          prevGroups.map(({ group, tasks, isUnsorted }) => {
            const currentGroupId = group?.id || null;
            if (currentGroupId === groupId) {
              return { 
                group, 
                tasks: tasks.map(t => t.id === optimisticTask.id ? result : t),
                isUnsorted
              };
            }
            return { group, tasks, isUnsorted };
          })
        );
      } catch (err) {
        console.error('Error saving inline task:', err);
        // Удаляем оптимистично добавленную задачу при ошибке
        setTaskGroups(prevGroups =>
          prevGroups.map(({ group, tasks, isUnsorted }) => {
            const currentGroupId = group?.id || null;
            if (currentGroupId === groupId) {
              return { group, tasks: tasks.filter(t => t.id !== optimisticTask.id), isUnsorted };
            }
            return { group, tasks, isUnsorted };
          })
        );
        setError('Ошибка при сохранении задания');
      }
    };

    // Автофокус на input при создании новой задачи
    useEffect(() => {
      if (creatingTaskGroupId && newTaskInputRef.current) {
        // Небольшая задержка для корректной работы после перерендера
        setTimeout(() => {
          newTaskInputRef.current?.focus();
        }, 0);
      }
    }, [creatingTaskGroupId]);

    // Обертки для обработчиков drag and drop с дополнительной логикой
    const handleGroupDragStartWrapper = useCallback((e: React.DragEvent, groupId: string) => {
      // Предотвращаем перетаскивание, если клик был на кнопке или другом интерактивном элементе
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
        e.preventDefault();
        return;
      }
      handleGroupDragStart(e, groupId);
    }, [handleGroupDragStart]);

    const handleTaskDragStartWrapper = useCallback((e: React.DragEvent, taskId: string, groupId: string | null) => {
      // Создаем клон элемента для непрозрачного drag изображения
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const clone = target.cloneNode(true) as HTMLElement;
      
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.left = '0';
      clone.style.width = rect.width + 'px';
      clone.style.height = rect.height + 'px';
      clone.style.opacity = '1';
      clone.style.pointerEvents = 'none';
      
      document.body.appendChild(clone);
      
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      
      e.dataTransfer.setDragImage(clone, offsetX, offsetY);
      
      requestAnimationFrame(() => {
        if (document.body.contains(clone)) {
          document.body.removeChild(clone);
        }
      });

      handleTaskDragStart(e, taskId, groupId);
    }, [handleTaskDragStart]);

    const handleToggleTask = async (taskId: string, completed: boolean) => {
      // Находим задание в группах
      const groupWithTask = taskGroups.find(g => g.tasks.some(t => t.id === taskId));
      const task = groupWithTask?.tasks.find(t => t.id === taskId);
      const previousStatus = task?.status || 'pending';
      
      // Обновляем статус локально для мгновенного отклика
      setTaskGroups(prevGroups => 
        prevGroups.map(group => ({
          ...group,
          tasks: group.tasks.map(t => 
            t.id === taskId 
              ? { ...t, status: completed ? 'completed' : 'pending' }
              : t
          )
        }))
      );

      // Обновляем статус на сервере
      try {
        const updatedTask = await taskService.updateOrganizerTask(taskId, { 
          status: completed ? 'completed' : 'pending' 
        });
        
        if (updatedTask) {
          setTaskGroups(prevGroups => 
            prevGroups.map(group => ({
              ...group,
              tasks: group.tasks.map(t => 
                t.id === taskId ? updatedTask : t
              )
            }))
          );
        }
      } catch (error) {
        console.error('Error updating task:', error);
        // В случае ошибки возвращаем предыдущее состояние
        setTaskGroups(prevGroups => 
          prevGroups.map(group => ({
            ...group,
            tasks: group.tasks.map(t => 
              t.id === taskId 
                ? { ...t, status: previousStatus }
                : t
            )
          }))
        );
      }
    };

    // Отслеживаем, какие задания были выполнены при загрузке страницы
    // ВАЖНО: Все хуки должны быть объявлены ДО любого условного return
    const [initiallyCompletedTaskIds, setInitiallyCompletedTaskIds] = useState<Set<string>>(new Set());
    
    useEffect(() => {
      if (taskGroups.length > 0 && initiallyCompletedTaskIds.size === 0) {
        const completedIds = new Set<string>();
        taskGroups.forEach(({ tasks }) => {
          tasks.filter(t => t.status === 'completed').forEach(t => {
            completedIds.add(t.id);
          });
        });
        setInitiallyCompletedTaskIds(completedIds);
      }
    }, [taskGroups.length, initiallyCompletedTaskIds.size]);

    // Мемоизируем разделение задач на активные и выполненные
    // ВАЖНО: useMemo должен быть ДО условного return
    const taskGroupsWithSplit = useMemo(() => {
      return taskGroups.map(({ group, tasks, isUnsorted }) => {
        const { active, completed } = splitTasksByStatus(tasks, initiallyCompletedTaskIds);
        return { group, tasks, isUnsorted, activeTasks: active, completedTasks: completed };
      });
    }, [taskGroups, initiallyCompletedTaskIds]);

    // Показываем загрузку только если данных еще нет
    if (loadingTasks && taskGroups.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <p className="text-[18px] font-forum font-light text-[#00000080]">Загрузка...</p>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <ScrollbarStyles />
        {/* Блоки заданий в Kanban-стиле */}
        {taskGroups.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 items-start task-blocks-scroll" style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#00000040 transparent'
          }}>
            {taskGroupsWithSplit.map(({ group, activeTasks, completedTasks, isUnsorted }) => {
              const groupId = group?.id || null;
              const isCompletedExpanded = groupId ? expandedCompletedSections.has(groupId) : false;
              const backgroundColor = group?.color || '#f0f0f0';
              const isMenuOpen = groupId ? showGroupMenu === groupId : false;

              return (
                <TaskColumn
                  key={groupId || 'unsorted'}
                  group={group}
                  tasks={[...activeTasks, ...completedTasks]}
                  isUnsorted={isUnsorted}
                  activeTasks={activeTasks}
                  completedTasks={completedTasks}
                  isCompletedExpanded={isCompletedExpanded}
                  backgroundColor={backgroundColor}
                  isMenuOpen={isMenuOpen}
                  editingTaskId={editingTaskId}
                  editingTaskText={editingTaskText}
                  expandedTaskLogs={expandedTaskLogs}
                  taskLogs={taskLogs}
                  loadingLogs={loadingLogs}
                  initiallyCompletedTaskIds={initiallyCompletedTaskIds}
                  creatingTaskGroupId={creatingTaskGroupId}
                  newTaskText={newTaskText}
                  newTaskInputRef={newTaskInputRef}
                  onToggleCompleted={(gId) => {
                    if (!gId) return;
                    setExpandedCompletedSections(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(gId)) {
                        newSet.delete(gId);
                      } else {
                        newSet.add(gId);
                      }
                      return newSet;
                    });
                  }}
                  onTaskToggle={handleToggleTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onSaveInlineEdit={handleSaveInlineEditTask}
                  onCancelInlineEdit={handleCancelInlineEditTask}
                  onEditingTaskTextChange={setEditingTaskText}
                  onToggleTaskLogs={toggleTaskLogs}
                  onTaskDragStart={handleTaskDragStartWrapper}
                  onTaskDragOver={handleTaskDragOver}
                  onTaskDragEnd={handleTaskDragEnd}
                  onGroupMenuClick={setShowGroupMenu}
                  onEditGroup={handleEditGroup}
                  onDeleteGroup={handleDeleteGroup}
                  onSaveInlineTask={handleSaveInlineTask}
                  onNewTaskTextChange={setNewTaskText}
                  newTaskPriority={newTaskPriority}
                  onNewTaskPriorityChange={setNewTaskPriority}
                  onCancelCreatingTask={() => {
                    setCreatingTaskGroupId(null);
                    setNewTaskText('');
                    setNewTaskPriority('medium');
                  }}
                  onCreateTask={handleCreateTask}
                  onGroupDragStart={handleGroupDragStartWrapper}
                  onGroupDragOver={handleGroupDragOver}
                  onGroupDrop={handleGroupDrop}
                  onGroupDragEnd={handleGroupDragEnd}
                  onTaskDropOnGroup={handleTaskDropOnGroup}
                  draggedGroupId={draggedGroupId}
                  draggedTaskId={draggedTaskId}
                />
              );
            })}
            {/* Кнопка создания нового блока в конце списка */}
            <button
              onClick={handleCreateGroup}
              className="flex-shrink-0 w-[200px] sm:w-[240px] h-[80px] border border-[#00000033] rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center text-[12px] max-[1599px]:text-[11px] font-forum text-[#00000080] hover:text-black border-dashed"
            >
              + Создать
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#00000033] rounded-lg p-8 text-center">
            <p className="text-[18px] font-forum font-light text-[#00000080] mb-4">Нет блоков заданий</p>
            <button
              onClick={handleCreateGroup}
              className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
            >
              Создать первый блок
            </button>
          </div>
        )}

        {/* Task Modal */}
        {showOrganizerTaskModal && (
          <OrganizerTaskModal
            task={editingOrganizerTask}
            onClose={() => {
              setShowOrganizerTaskModal(false);
              setEditingOrganizerTask(null);
              setSelectedGroupId(null);
            }}
            onSave={handleSaveTask}
          />
        )}

        {/* Task Group Modal - простой модал для создания/редактирования блока */}
        {showTaskGroupModal && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ animation: 'modal-backdrop-fade-in 0.3s ease-out forwards' }}>
            <div className="bg-[#eae6db] border border-[#00000033] rounded-lg max-w-md w-full" style={{ animation: 'modal-content-scale-in 0.3s ease-out forwards' }}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[28px] max-[1599px]:text-[24px] font-forum font-bold text-black">
                    {editingTaskGroup ? 'Редактировать блок' : 'Создать блок'}
                  </h2>
                  <button onClick={() => {
                    setShowTaskGroupModal(false);
                    setEditingTaskGroup(null);
                  }} className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light">
                    ✕
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = (formData.get('name') as string)?.trim() || '';
                  
                  if (!name) return;

                  const currentColor = hslToHex(colorPickerHue, colorPickerSaturation, colorPickerLightness);

                  handleSaveGroup({
                    organizer_id: user?.id || '',
                    name: name,
                    color: currentColor || undefined,
                  });
                }} className="space-y-4">
                  <div>
                    <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                      Название блока *
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingTaskGroup?.name || ''}
                      required
                      className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-3">
                      Палитра
                    </label>
                    
                    {/* Палитра цветов */}
                    <div className="space-y-3">
                      {/* Верхняя часть: квадрат выбранного цвета и градиент */}
                      <div className="flex gap-3">
                        {/* Квадрат с выбранным цветом */}
                        <div 
                          className="w-16 h-16 rounded-lg border-2 border-[#00000033] flex-shrink-0"
                          style={{ backgroundColor: hslToHex(colorPickerHue, colorPickerSaturation, colorPickerLightness) }}
                        />
                        
                        {/* Градиентная область для насыщенности/яркости */}
                        <div 
                          className="flex-1 h-16 rounded-lg border-2 border-[#00000033] relative cursor-crosshair overflow-hidden"
                          style={{
                            background: `linear-gradient(to right, white, hsl(${colorPickerHue}, 100%, 50%)), linear-gradient(to bottom, transparent, black)`,
                            backgroundBlendMode: 'multiply'
                          }}
                          onMouseDown={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            setColorPickerSaturation(Math.max(0, Math.min(100, x)));
                            setColorPickerLightness(Math.max(0, Math.min(100, 100 - y)));
                            
                            const handleMove = (moveEvent: MouseEvent) => {
                              const newX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
                              const newY = ((moveEvent.clientY - rect.top) / rect.height) * 100;
                              setColorPickerSaturation(Math.max(0, Math.min(100, newX)));
                              setColorPickerLightness(Math.max(0, Math.min(100, 100 - newY)));
                            };
                            
                            const handleUp = () => {
                              document.removeEventListener('mousemove', handleMove);
                              document.removeEventListener('mouseup', handleUp);
                            };
                            
                            document.addEventListener('mousemove', handleMove);
                            document.addEventListener('mouseup', handleUp);
                          }}
                        >
                          {/* Индикатор текущей позиции */}
                          <div
                            className="absolute w-3 h-3 rounded-full border-2 border-white shadow-lg pointer-events-none"
                            style={{
                              left: `${colorPickerSaturation}%`,
                              top: `${100 - colorPickerLightness}%`,
                              transform: 'translate(-50%, -50%)',
                              backgroundColor: hslToHex(colorPickerHue, colorPickerSaturation, colorPickerLightness)
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Ползунок оттенка */}
                      <div className="relative h-8 rounded-lg overflow-hidden">
                        <div
                          className="absolute inset-0 cursor-pointer"
                          style={{
                            background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                          }}
                          onMouseDown={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 360;
                            setColorPickerHue(Math.max(0, Math.min(360, x)));
                            
                            const handleMove = (moveEvent: MouseEvent) => {
                              const newX = ((moveEvent.clientX - rect.left) / rect.width) * 360;
                              setColorPickerHue(Math.max(0, Math.min(360, newX)));
                            };
                            
                            const handleUp = () => {
                              document.removeEventListener('mousemove', handleMove);
                              document.removeEventListener('mouseup', handleUp);
                            };
                            
                            document.addEventListener('mousemove', handleMove);
                            document.addEventListener('mouseup', handleUp);
                          }}
                        >
                          {/* Индикатор текущего оттенка */}
                          <div
                            className="absolute top-0 bottom-0 w-1 bg-white border border-black shadow-lg pointer-events-none"
                            style={{
                              left: `${(colorPickerHue / 360) * 100}%`,
                              transform: 'translateX(-50%)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTaskGroupModal(false);
                        setEditingTaskGroup(null);
                      }}
                      className="px-4 md:px-6 py-2 md:py-3 border border-[#00000033] rounded-lg text-black hover:bg-white transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum bg-[#eae6db]"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-black text-white rounded-md hover:bg-[#1a1a1a] active:scale-[0.98] transition-all duration-200 cursor-pointer text-[15px] max-[1599px]:text-[13px] font-forum font-medium"
                    >
                      {editingTaskGroup ? 'Сохранить' : 'Создать'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const [weddingsData, clientsData] = await Promise.all([
        weddingService.getOrganizerWeddings(user.id),
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

  // Используем ref для отслеживания, был ли уже загружен user.id
  const loadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user?.id && user.role === 'organizer') {
      // Загружаем данные только один раз при монтировании или при изменении user.id
      if (loadedUserIdRef.current !== user.id) {
        loadedUserIdRef.current = user.id;
      loadData();
      }
    } else if (user && user.role !== 'organizer') {
      // Если пользователь не организатор, перенаправляем
      // Но только если он не находится уже на правильной странице
      if (window.location.pathname !== '/dashboard' && window.location.pathname !== '/client') {
      navigate('/dashboard', { replace: true });
    }
    }
  }, [user?.id, user?.role, navigate, loadData]);

  // Сохраняем viewMode в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem('organizer_viewMode', viewMode);
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
      const savedViewMode = localStorage.getItem('organizer_viewMode');
      if (savedViewMode && savedViewMode !== 'wedding-details') {
        // Если viewMode не 'wedding-details', просто устанавливаем его
        // (viewMode уже восстановлен из localStorage при инициализации, но на всякий случай)
        if (savedViewMode === 'tasks' || savedViewMode === 'weddings') {
          setViewMode(savedViewMode as ViewMode);
        }
      } else if (savedViewMode === 'wedding-details' && !lastActiveTabId) {
        // Если viewMode был 'wedding-details', но нет lastActiveTabId, переключаемся на ивенты
        setViewMode('weddings');
      }
    }
  }, [weddings.length, lastActiveTabId, selectedWedding]); // Добавляем selectedWedding для проверки

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
          localStorage.setItem('organizer_lastActiveTabId', weddingId);
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
        localStorage.setItem('organizer_lastActiveTabId', weddingId);
        setLastActiveTabId(weddingId);
        return newTabs;
      });

      setViewMode('wedding-details');
    } catch (err) {
      console.error('Error loading wedding details:', err);
      setError('Ошибка при загрузке данных');
    } finally {
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
        localStorage.setItem('organizer_lastActiveTabId', lastTab.weddingId);
        setLastActiveTabId(lastTab.weddingId);
        loadWeddingDetails(lastTab.weddingId);
      } else {
        // Если вкладок не осталось, переключаемся на ивенты
        setSelectedWedding(null);
        setViewMode('weddings');
        localStorage.removeItem('organizer_lastActiveTabId');
        setLastActiveTabId(null);
      }
    }
  };

  const handleTabClick = (tab: OpenTab) => {
    if (selectedWedding?.id !== tab.weddingId) {
      localStorage.setItem('organizer_lastActiveTabId', tab.weddingId);
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

  const handleDeleteWedding = async (weddingId: string) => {
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
            localStorage.removeItem('organizer_lastActiveTabId');
            setLastActiveTabId(null);
          }
        }
      } else {
        setError('Не удалось удалить ивент. Проверьте консоль для деталей.');
      }
    } catch (err) {
      console.error('Error deleting wedding:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при удалении ивента');
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
        // order: 0, // Убрано, пока колонка не будет добавлена в БД
      },
      {
        wedding_id: weddingId,
        name: 'Тайминг',
        name_en: 'Timing plan',
        name_ru: 'Тайминг',
        name_ua: 'Таймінг',
        pinned: true,
        // order: 1,
      },
      {
        wedding_id: weddingId,
        name: 'Этапы подготовки свадьбы',
        name_en: 'Stages of wedding preparation',
        name_ru: 'Этапы подготовки свадьбы',
        name_ua: 'Етапи підготовки весілля',
        pinned: true,
        // order: 2,
      },
      // Незакрепленные документы
      {
        wedding_id: weddingId,
        name: 'Список гостей',
        name_en: 'Guest list',
        name_ru: 'Список гостей',
        name_ua: 'Список гостей',
        pinned: false,
        // order: 0,
      },
      {
        wedding_id: weddingId,
        name: 'Договор & JS',
        name_en: 'Agreement & JS',
        name_ru: 'Договор & JS',
        name_ua: 'Договір & JS',
        pinned: false,
        // order: 1,
      },
      {
        wedding_id: weddingId,
        name: 'Тайминг утра невесты',
        name_en: "Bride's morning timing plan",
        name_ru: 'Тайминг утра невесты',
        name_ua: 'Таймінг ранку нареченої',
        pinned: false,
        // order: 2,
      },
      {
        wedding_id: weddingId,
        name: 'Проживание гостей и специалистов',
        name_en: 'Accommodation of guests and specialists',
        name_ru: 'Проживание гостей и специалистов',
        name_ua: 'Проживання гостей та спеціалістів',
        pinned: false,
        // order: 3,
      },
      {
        wedding_id: weddingId,
        name: 'План рассадки',
        name_en: 'Seating plan',
        name_ru: 'План рассадки',
        name_ua: 'План розсадки',
        pinned: false,
        // order: 4,
      },
      {
        wedding_id: weddingId,
        name: 'Меню',
        name_en: 'Menu',
        name_ru: 'Меню',
        name_ua: 'Меню',
        pinned: false,
        // order: 5,
      },
      {
        wedding_id: weddingId,
        name: 'Алкоголь',
        name_en: 'Alcohol list',
        name_ru: 'Алкоголь',
        name_ua: 'Алкоголь',
        pinned: false,
        // order: 6,
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
      setShowClientModal(false);
      await loadData(); // Перезагружаем данные, чтобы обновить список клиентов
    } catch (err: unknown) {
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
    setDraggedTaskId(taskId);
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
    if (!selectedWedding || !draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      return;
    }

    const tasks = selectedWedding.tasks || [];
    const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
    const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedTaskId(null);
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

    setDraggedTaskId(null);
  };

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
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

  // Статистика (можно использовать в будущем)
  // const stats = {
  //   totalWeddings: weddings.length,
  //   totalClients: clients.length,
  //   totalTasks: selectedWedding?.tasks?.length || 0,
  //   completedTasks: selectedWedding?.tasks?.filter(t => t.status === 'completed').length || 0,
  // };

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
              <h1 className="text-[24px] sm:text-[28px] md:text-[32px] lg:text-[36px] max-[1599px]:text-[28px] lg:max-[1599px]:text-[26px] min-[1300px]:max-[1599px]:text-[30px] font-forum leading-tight text-black">Панель организатора</h1>
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
      <nav className="bg-[#eae6db] border-b border-[#00000033] overflow-x-auto flex-shrink-0">
        <div className="px-3 sm:px-4 md:px-8 lg:px-12 xl:px-[60px]">
          <div className="flex space-x-4 sm:space-x-6 md:space-x-8 min-w-max">
            <button
              onClick={() => {
                setViewMode('tasks');
                setSelectedWedding(null);
                localStorage.removeItem('organizer_lastActiveTabId');
                setLastActiveTabId(null);
              }}
              className={`py-3 sm:py-4 px-1 border-b-2 font-forum text-[16px] sm:text-[18px] max-[1599px]:text-[16px] transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'tasks'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#00000080] hover:text-black hover:border-[#00000033]'
              }`}
            >
              Задания
            </button>
            <button
              onClick={() => {
                setViewMode('weddings');
                setSelectedWedding(null);
                localStorage.removeItem('organizer_lastActiveTabId');
                setLastActiveTabId(null);
              }}
              className={`py-3 sm:py-4 px-1 border-b-2 font-forum text-[16px] sm:text-[18px] max-[1599px]:text-[16px] transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'weddings'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#00000080] hover:text-black hover:border-[#00000033]'
              }`}
            >
              Ивенты ({weddings.length})
            </button>
            {/* Открытые вкладки проектов/ивентов */}
            {openTabs.map((tab) => {
              const isActive = viewMode === 'wedding-details' && selectedWedding?.id === tab.weddingId;
              return (
                <div
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-forum text-[16px] sm:text-[18px] max-[1599px]:text-[16px] transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    isActive
                      ? 'border-black text-black'
                      : 'border-transparent text-[#00000080] hover:text-black hover:border-[#00000033]'
                  }`}
                >
                  <span>{tab.name}</span>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="ml-1 hover:bg-[#00000010] rounded-full p-0.5 transition-colors"
                    aria-label="Закрыть вкладку"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-current"
                    >
                      <path
                        d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden px-3 sm:px-4 md:px-8 lg:px-12 xl:px-[60px] pt-1 pb-1 font-forum">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-forum text-[16px]">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-[16px] text-red-600 hover:text-red-800 font-forum cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        )}

        {viewMode === 'tasks' && (
          <TasksPage
            user={user}
            viewMode={viewMode}
          />
        )}

        {viewMode === 'weddings' && (
          <div className="h-full flex flex-col">
            {/* Кнопки над списком ивентов слева сверху */}
            <div className="flex gap-2 mb-4 flex-shrink-0">
              <button
                onClick={handleCreateClient}
                className="px-2 py-1.5 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[12px] max-[1599px]:text-[11px] font-forum"
                title="Создать клиента"
              >
                + Клиент
              </button>
              <button
                onClick={handleCreateWedding}
                className="px-2 py-1.5 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[12px] max-[1599px]:text-[11px] font-forum"
                title="Добавить ивент"
              >
                + Ивент
              </button>
            </div>

            {weddings.length > 0 ? (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {[...weddings].sort((a, b) => {
                  // Сортируем по дате: ближайший ивент первым
                  const dateA = a.wedding_date ? new Date(a.wedding_date).getTime() : 0;
                  const dateB = b.wedding_date ? new Date(b.wedding_date).getTime() : 0;
                  // Если дата отсутствует, помещаем в конец
                  if (!dateA && !dateB) return 0;
                  if (!dateA) return 1;
                  if (!dateB) return -1;
                  // Сортируем по возрастанию (ближайший первым)
                  return dateA - dateB;
                }).map((wedding) => {
                  // Функция для форматирования даты
                  const formatDate = (dateString: string) => {
                    const date = new Date(dateString);
                    const day = date.getDate();
                    const monthIndex = date.getMonth();
                    const year = date.getFullYear();
                    
                    const monthNames = [
                      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
                    ];
                    
                    const monthName = monthNames[monthIndex];
                    return `${day} ${monthName} ${year}`;
                  };

                  // Функция для расчета дней до свадьбы
                  const calculateDaysUntilWedding = (weddingDate: string): number => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const wedding = new Date(weddingDate);
                    wedding.setHours(0, 0, 0, 0);
                    
                    const diffTime = wedding.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    return diffDays > 0 ? diffDays : 0;
                  };

                  // Функция для получения страны
                  const getCountryDisplay = () => {
                    return wedding.country_ru || wedding.country || wedding.country_en || wedding.country_ua || '';
                  };

                  return (
                    <div
                      key={wedding.id}
                      onClick={() => loadWeddingDetails(wedding.id)}
                      className="bg-white border border-[#00000033] rounded-lg p-4 sm:p-5 md:p-6 hover:shadow-lg transition cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[18px] sm:text-[20px] md:text-[22px] max-[1599px]:text-[20px] font-forum font-bold text-black mb-3 break-words" style={{ fontWeight: 'bold' }}>
                            {wedding.project_name || `${wedding.couple_name_1_ru || wedding.couple_name_1_en || ''} & ${wedding.couple_name_2_ru || wedding.couple_name_2_en || ''}`}
                          </h3>
                          
                          {/* Информация как в деталях свадьбы на странице клиента */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div>
                              <p className="text-[12px] sm:text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mb-1">
                                Дата свадьбы
                              </p>
                              <p className="text-[16px] sm:text-[18px] max-[1599px]:text-[17px] font-forum font-bold text-black">
                                {formatDate(wedding.wedding_date)}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-[12px] sm:text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mb-1">
                                Страна
                              </p>
                              <p className="text-[16px] sm:text-[18px] max-[1599px]:text-[17px] font-forum font-bold text-black break-words">
                                {getCountryDisplay()}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-[12px] sm:text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mb-1">
                                Место
                              </p>
                              <p className="text-[16px] sm:text-[18px] max-[1599px]:text-[17px] font-forum font-bold text-black break-words">
                                {wedding.venue}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-[12px] sm:text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mb-1">
                                Количество гостей
                              </p>
                              <p className="text-[16px] sm:text-[18px] max-[1599px]:text-[17px] font-forum font-bold text-black">
                                {wedding.guest_count}
                              </p>
                            </div>
                            
                            <div className="col-span-2">
                              <p className="text-[16px] sm:text-[18px] max-[1599px]:text-[17px] font-forum font-bold text-black mb-1">
                                {calculateDaysUntilWedding(wedding.wedding_date)} дней
                              </p>
                              <p className="text-[12px] sm:text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">
                                до ивента
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditWedding(wedding);
                          }}
                          className="ml-2 p-2 text-[#00000080] hover:text-black transition-colors cursor-pointer flex-shrink-0"
                          aria-label="Редактировать"
                        >
                          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.333 2.00001C11.5084 1.82475 11.7163 1.68596 11.9447 1.59219C12.1731 1.49843 12.4173 1.45166 12.6637 1.45468C12.9101 1.4577 13.1531 1.51045 13.3787 1.60982C13.6043 1.70919 13.8078 1.85316 13.9773 2.03335C14.1469 2.21354 14.2792 2.42619 14.3668 2.65889C14.4544 2.89159 14.4954 3.13978 14.4873 3.38868C14.4792 3.63758 14.4222 3.88238 14.3197 4.10868C14.2172 4.33498 14.0714 4.53838 13.8913 4.70668L5.528 13.07L2 14L2.93 10.472L11.333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
              ) : (
              <div className="bg-white border border-[#00000033] rounded-lg p-12 text-center">
                <p className="text-[18px] font-forum font-light text-[#00000080] mb-4">Нет ивентов</p>
                <button
                  onClick={handleCreateWedding}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
                >
                  Создать первый ивент
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'wedding-details' && selectedWedding && (
          <div className="h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-5 md:mb-6 flex-shrink-0">
              <div className="w-full sm:w-auto min-w-0">
                <button
                  onClick={() => {
                    setViewMode('weddings');
                    setSelectedWedding(null);
                  }}
                  className="text-[16px] sm:text-[18px] max-[1599px]:text-[16px] font-forum text-[#00000080] hover:text-black transition-colors mb-2 cursor-pointer"
                >
                  Вернуться к ивентам
                </button>
                <h2 className="text-[28px] sm:text-[32px] md:text-[36px] lg:text-[54px] max-[1599px]:text-[40px] lg:max-[1599px]:text-[36px] min-[1300px]:max-[1599px]:text-[42px] font-forum font-bold leading-tight text-black break-words">
                  {selectedWedding.project_name || 'Без названия'}
                </h2>
              </div>
              <button
                onClick={() => handleEditWedding(selectedWedding)}
                className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[14px] sm:text-[16px] md:text-[18px] max-[1599px]:text-[16px] font-forum w-full sm:w-auto"
              >
                Редактировать ивент
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Wedding Info */}
              <div className="bg-white border border-[#00000033] rounded-lg p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6">
              <h3 className="text-[20px] sm:text-[22px] md:text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black mb-3 sm:mb-4">Информация об ивенте</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Дата свадьбы</p>
                  <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">
                    {new Date(selectedWedding.wedding_date).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Дней до свадьбы</p>
                  <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const wedding = new Date(selectedWedding.wedding_date);
                      wedding.setHours(0, 0, 0, 0);
                      const diffTime = wedding.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays > 0 ? diffDays : (diffDays === 0 ? 0 : 'Прошло');
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Страна</p>
                  <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">
                    {selectedWedding.country_ru || selectedWedding.country || selectedWedding.country_en || selectedWedding.country_ua || ''}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Место</p>
                  <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">{selectedWedding.venue}</p>
                </div>
                <div>
                  <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Количество гостей</p>
                  <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1">{selectedWedding.guest_count}</p>
                </div>
                {selectedWedding.client && (
                  <div>
                    <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Клиент</p>
                    <p className="text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1">{selectedWedding.client.name}</p>
                    <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080] mt-1">{selectedWedding.client.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Client Notes */}
            {selectedWedding.notes && (
              <div className="bg-white border border-[#00000033] rounded-lg p-6 mb-6">
                <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black mb-4">Заметки клиента</h3>
                <div className="bg-[#eae6db] border border-[#00000033] rounded-lg p-4">
                  <p className="text-[18px] max-[1599px]:text-[16px] font-forum font-light text-black whitespace-pre-wrap">
                    {selectedWedding.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Tasks */}
            <div className="bg-white border border-[#00000033] rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black">Задания</h3>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000060] mt-1">
                    Перетащите элементы для изменения порядка
                  </p>
                </div>
                <button
                  onClick={handleCreateTask}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
                >
                  + Добавить задание
                </button>
              </div>
              {selectedWedding.tasks && selectedWedding.tasks.length > 0 ? (
                <div className="space-y-3">
                  {selectedWedding.tasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleTaskDragStart(e, task.id)}
                      onDragOver={handleTaskDragOver}
                      onDrop={(e) => handleTaskDrop(e, task.id)}
                      onDragEnd={handleTaskDragEnd}
                      className="border border-[#00000033] rounded-lg p-4 flex justify-between items-start hover:shadow-md transition cursor-move"
                    >
                      <div className="flex items-start gap-2 flex-1">
                        <div className="text-[#00000040] mt-1 cursor-move select-none">⋮⋮</div>
                        <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-[14px] rounded-full font-forum ${
                              task.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : task.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {task.status === 'completed'
                              ? 'Выполнено'
                              : task.status === 'in_progress'
                              ? 'В процессе'
                              : 'Ожидает'}
                          </span>
                        </div>
                        <h4 className="text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-2">
                          {task.title_ru || task.title || task.title_en || task.title_ua || ''}
                        </h4>
                        {task.link && (() => {
                          // Выбираем текст ссылки (приоритет русскому)
                          const linkText = task.link_text_ru || task.link_text || task.link_text_en || task.link_text_ua;
                          
                          return linkText ? (
                            <a
                              href={task.link.startsWith('http') ? task.link : `https://${task.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[16px] max-[1599px]:text-[15px] font-forum text-black hover:underline mt-1 inline-block cursor-pointer"
                            >
                              {linkText} →
                            </a>
                          ) : null;
                        })()}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="px-3 py-1 bg-white border border-[#00000033] text-black rounded hover:bg-gray-50 transition-colors cursor-pointer text-[16px] font-forum"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer text-[16px] font-forum"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[18px] font-forum font-light text-[#00000080]">Задач пока нет</p>
              )}
            </div>

            {/* Documents */}
            <div className="bg-white border border-[#00000033] rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black">Документы</h3>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000060] mt-1">
                    Перетащите элементы для изменения порядка (закрепленные и незакрепленные отдельно)
                  </p>
                </div>
                <button
                  onClick={handleCreateDocument}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
                >
                  + Добавить документ
                </button>
              </div>
              {selectedWedding.documents && selectedWedding.documents.length > 0 ? (
                <div className="space-y-3">
                  {selectedWedding.documents.map((doc) => (
                    <div
                      key={doc.id}
                      draggable
                      onDragStart={(e) => handleDocumentDragStart(e, doc.id)}
                      onDragOver={handleDocumentDragOver}
                      onDrop={(e) => handleDocumentDrop(e, doc.id)}
                      onDragEnd={handleDocumentDragEnd}
                      className={`border border-[#00000033] rounded-lg p-4 flex justify-between items-center hover:shadow-md transition cursor-move ${
                        draggedDocumentId === doc.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="text-[#00000040] cursor-move select-none">⋮⋮</div>
                        <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black">
                            {doc.name_ru || doc.name || doc.name_en || doc.name_ua || ''}
                          </h4>
                          {doc.pinned && (
                            <span className="px-2 py-1 text-[14px] font-forum bg-yellow-100 text-yellow-800 rounded">
                              Закреплено
                            </span>
                          )}
                        </div>
                        {doc.link && (
                          <a
                            href={doc.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[16px] max-[1599px]:text-[15px] font-forum text-black hover:underline mt-1 inline-block cursor-pointer"
                          >
                            Открыть ссылку
                          </a>
                        )}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="px-3 py-1 bg-white border border-[#00000033] text-black rounded hover:bg-gray-50 transition-colors cursor-pointer text-[16px] font-forum"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer text-[16px] font-forum"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[18px] font-forum font-light text-[#00000080]">Нет документов</p>
              )}
            </div>

            {/* Presentation */}
            <div className="bg-white border border-[#00000033] rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black">Презентация</h3>
                <div className="flex gap-2">
                  {selectedWedding.presentation && selectedWedding.presentation.type === 'wedding' && (
                    <button
                      onClick={handleDeletePresentation}
                      className="px-4 md:px-6 py-2 md:py-3 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
                    >
                      Удалить презентацию
                    </button>
                  )}
                  <button
                    onClick={() => setShowPresentationModal(true)}
                    className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
                  >
                    {selectedWedding.presentation && selectedWedding.presentation.type === 'wedding' 
                      ? 'Изменить презентацию' 
                      : 'Загрузить презентацию'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">
                  {selectedWedding.presentation && selectedWedding.presentation.type === 'wedding' 
                    ? `Тип: Презентация свадьбы - "${selectedWedding.presentation.title}"`
                    : `Тип: Стандартная презентация компании`}
                </p>
                {selectedWedding.presentation && selectedWedding.presentation.sections && (
                  <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">
                    Секций: {selectedWedding.presentation.sections.length}
                  </p>
                )}
              </div>
            </div>
            </div>
          </div>
        )}
      </main>

      {/* Wedding Modal */}
      {showWeddingModal && (
        <WeddingModal
          wedding={editingWedding}
          clients={clients}
          onClose={() => {
            setShowWeddingModal(false);
            setEditingWedding(null);
          }}
          onSave={handleSaveWedding}
          onDelete={handleDeleteWedding}
        />
      )}

      {/* Task Modal */}
      {showTaskModal && selectedWedding && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
        />
      )}

      {/* Document Modal */}
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

      {/* Presentation Modal */}
      {showPresentationModal && selectedWedding && (
        <PresentationModal
          onClose={() => setShowPresentationModal(false)}
          onUpload={handleUploadPresentation}
          uploading={uploadingPresentation}
        />
      )}

      {/* Client Modal */}
      {showClientModal && (
        <ClientModal
          onClose={() => setShowClientModal(false)}
          onSave={handleSaveClient}
        />
      )}
    </div>
  );
};

export default OrganizerDashboard;
