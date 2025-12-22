import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { weddingService, taskService, documentService, clientService, presentationService } from '../services/weddingService';
import type { Wedding, Task, TaskGroup, Document, User, Presentation } from '../types';
import { getTranslation } from '../utils/translations';
import { getInitialLanguage } from '../utils/languageUtils';
import { WeddingModal, TaskModal, OrganizerTaskModal, DocumentModal, PresentationModal, ClientModal } from '../components/modals';

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
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
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
  
  // Получаем язык из localStorage или используем русский по умолчанию
  const currentLanguage = getInitialLanguage();
  const t = getTranslation(currentLanguage);

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
  const TasksPage = ({ user, currentLanguage, t }: { user: User | null; currentLanguage: string; t: any }) => {
    const [taskGroups, setTaskGroups] = useState<{ group: TaskGroup; tasks: Task[] }[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [showOrganizerTaskModal, setShowOrganizerTaskModal] = useState(false);
    const [showTaskGroupModal, setShowTaskGroupModal] = useState(false);
    const [editingOrganizerTask, setEditingOrganizerTask] = useState<Task | null>(null);
    const [editingTaskGroup, setEditingTaskGroup] = useState<TaskGroup | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [showGroupMenu, setShowGroupMenu] = useState<string | null>(null);
    
    // Состояния для цветового пикера
    const [colorPickerHue, setColorPickerHue] = useState(0);
    const [colorPickerSaturation, setColorPickerSaturation] = useState(0);
    const [colorPickerLightness, setColorPickerLightness] = useState(100);

    // Функция для конвертации HEX в HSL
    const hexToHsl = (hex: string) => {
      if (!hex) return { h: 0, s: 0, l: 100 };
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return { h: h * 360, s: s * 100, l: l * 100 };
    };

    // Функция для конвертации HSL в HEX
    const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

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

    const loadOrganizerTasks = useCallback(async () => {
      if (!user?.id) return;
      setLoadingTasks(true);
      try {
        const groupsWithTasks = await taskService.getOrganizerTasksByGroups(user.id);
        setTaskGroups(groupsWithTasks);
      } catch (err) {
        console.error('Error loading organizer tasks:', err);
      } finally {
        setLoadingTasks(false);
      }
    }, [user?.id]);

    useEffect(() => {
      loadOrganizerTasks();
    }, [loadOrganizerTasks]);

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
          const result = await taskService.updateTaskGroup(editingTaskGroup.id, groupData);
          if (!result) {
            setError('Не удалось обновить блок заданий');
            return;
          }
        } else {
          const result = await taskService.createTaskGroup({
            ...groupData,
            organizer_id: user.id,
          });
          if (!result) {
            setError('Не удалось создать блок заданий');
            return;
          }
        }

        setShowTaskGroupModal(false);
        setEditingTaskGroup(null);
        await loadOrganizerTasks();
      } catch (err) {
        console.error('Error saving task group:', err);
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

    // Отслеживаем, какие задания были выполнены при загрузке страницы (для каждого блока отдельно)
    const [initiallyCompletedTaskIds, setInitiallyCompletedTaskIds] = useState<Set<string>>(new Set());
    
    useEffect(() => {
      if (taskGroups.length > 0 && initiallyCompletedTaskIds.size === 0) {
        // При первой загрузке сохраняем ID выполненных заданий из всех блоков
        const completedIds = new Set<string>();
        taskGroups.forEach(({ tasks }) => {
          tasks.filter(t => t.status === 'completed').forEach(t => {
            completedIds.add(t.id);
          });
        });
        setInitiallyCompletedTaskIds(completedIds);
      }
    }, [taskGroups.length, initiallyCompletedTaskIds.size]);


    const getGroupName = (group: TaskGroup) => {
      return group.name;
    };

    const handleCreateTask = (groupId: string) => {
      setEditingOrganizerTask(null);
      setSelectedGroupId(groupId);
      setShowOrganizerTaskModal(true);
    };

    const handleEditTask = (task: Task) => {
      setEditingOrganizerTask(task);
      setSelectedGroupId(task.task_group_id || null);
      setShowOrganizerTaskModal(true);
    };

    const handleSaveTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'wedding_id' | 'organizer_id' | 'task_group_id'>) => {
      if (!user?.id || !selectedGroupId) return;

      try {
        if (editingOrganizerTask) {
          const result = await taskService.updateOrganizerTask(editingOrganizerTask.id, taskData);
          if (!result) {
            setError(t.organizer.updateError);
            return;
          }
        } else {
          const result = await taskService.createOrganizerTask({
            ...taskData,
            organizer_id: user.id,
            task_group_id: selectedGroupId,
          });
          if (!result) {
            setError(t.organizer.createError);
            return;
          }
        }

        setShowOrganizerTaskModal(false);
        setEditingOrganizerTask(null);
        setSelectedGroupId(null);
        await loadOrganizerTasks();
      } catch (err) {
        console.error('Error saving task:', err);
        setError(t.organizer.saveError);
      }
    };

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

    const handleDeleteTask = async (taskId: string) => {
      if (!confirm('Вы уверены, что хотите удалить это задание?')) {
        return;
      }

      try {
        const success = await taskService.deleteOrganizerTask(taskId);
        if (success) {
          await loadOrganizerTasks();
        } else {
          setError('Не удалось удалить задание');
        }
      } catch (err) {
        console.error('Error deleting task:', err);
        setError('Ошибка при удалении задания');
      }
    };

    const getTaskTitle = (task: Task) => {
      if (currentLanguage === 'en' && task.title_en) return task.title_en;
      if (currentLanguage === 'ua' && task.title_ua) return task.title_ua;
      if (currentLanguage === 'ru' && task.title_ru) return task.title_ru;
      return task.title;
    };

    const getTaskLinkText = (task: Task) => {
      if (currentLanguage === 'ua' && task.link_text_ua) return task.link_text_ua;
      if (currentLanguage === 'ru' && task.link_text_ru) return task.link_text_ru;
      if (currentLanguage === 'en' && task.link_text_en) return task.link_text_en;
      return task.link_text;
    };

    if (loadingTasks) {
      return (
        <div className="flex items-center justify-center py-12">
          <p className="text-[18px] font-forum font-light text-[#00000080]">Загрузка...</p>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-end mb-4 flex-shrink-0">
          <button
            onClick={handleCreateGroup}
            className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[14px] sm:text-[16px] md:text-[18px] max-[1599px]:text-[16px] font-forum"
          >
            + Создать
          </button>
        </div>

        {/* Блоки заданий в Kanban-стиле */}
        {taskGroups.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
            {taskGroups.map(({ group, tasks }) => {
              // Разделяем задания на активные и выполненные
              const activeTasks = tasks.filter(t => {
                if (t.status !== 'completed') return true;
                // Выполненные задания остаются в активных до перезагрузки
                return !initiallyCompletedTaskIds.has(t.id);
              });

              const completedTasks = tasks.filter(t => 
                t.status === 'completed' && initiallyCompletedTaskIds.has(t.id)
              );

              const backgroundColor = group.color || '#ffffff';
              const isMenuOpen = showGroupMenu === group.id;

              return (
                <div 
                  key={group.id} 
                  className="flex-shrink-0 w-[280px] sm:w-[320px] border border-[#00000033] rounded-lg flex flex-col"
                  style={{ 
                    backgroundColor,
                    maxHeight: 'calc(100vh - 200px)',
                    height: 'auto'
                  }}
                >
                  {/* Заголовок блока с меню */}
                  <div className="px-4 py-3 border-b border-[#00000033] flex-shrink-0 flex items-center justify-between relative">
                    <h3 className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black">
                      {getGroupName(group)}
                    </h3>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGroupMenu(isMenuOpen ? null : group.id);
                        }}
                        className="p-1 text-[#00000080] hover:text-black transition-colors cursor-pointer"
                        aria-label="Меню"
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="4" r="1.5" fill="currentColor"/>
                          <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                          <circle cx="10" cy="16" r="1.5" fill="currentColor"/>
                        </svg>
                      </button>
                      {isMenuOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowGroupMenu(null)}
                          />
                          <div className="absolute right-0 top-8 bg-white border border-[#00000033] rounded-lg shadow-lg z-20 min-w-[120px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowGroupMenu(null);
                                handleEditGroup(group);
                              }}
                              className="w-full px-4 py-2 text-left text-[14px] font-forum text-black hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              Редактировать
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowGroupMenu(null);
                                handleDeleteGroup(group.id);
                              }}
                              className="w-full px-4 py-2 text-left text-[14px] font-forum text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              Удалить
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Контент колонки с прокруткой */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                    {/* Активные задания */}
                    {activeTasks.length > 0 && (
                      <>
                        {activeTasks.map((task) => {
                          const isCompleted = task.status === 'completed';
                          return (
                            <div
                              key={task.id}
                              className={`border border-[#00000033] rounded-lg p-3 bg-white hover:shadow-md transition ${
                                isCompleted ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <button
                                  onClick={() => handleToggleTask(task.id, !isCompleted)}
                                  className={`mt-0.5 flex-shrink-0 w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors ${
                                    isCompleted 
                                      ? 'border-green-500 bg-green-500' 
                                      : 'border-[#00000080] hover:border-black bg-white'
                                  }`}
                                  aria-label={isCompleted ? "Отметить невыполненным" : "Отметить выполненным"}
                                >
                                  {isCompleted && (
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[14px] max-[1599px]:text-[13px] font-forum ${
                                    isCompleted ? 'text-[#00000060] line-through' : 'text-black'
                                  }`}>
                                    {getTaskTitle(task)}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleEditTask(task)}
                                  className="mt-0.5 p-1 text-[#00000080] hover:text-black transition-colors cursor-pointer flex-shrink-0"
                                  aria-label="Редактировать"
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11.333 2.00001C11.5084 1.82475 11.7163 1.68596 11.9447 1.59219C12.1731 1.49843 12.4173 1.45166 12.6637 1.45468C12.9101 1.4577 13.1531 1.51045 13.3787 1.60982C13.6043 1.70919 13.8078 1.85316 13.9773 2.03335C14.1469 2.21354 14.2792 2.42619 14.3668 2.65889C14.4544 2.89159 14.4954 3.13978 14.4873 3.38868C14.4792 3.63758 14.4222 3.88238 14.3197 4.10868C14.2172 4.33498 14.0714 4.53838 13.8913 4.70668L5.528 13.07L2 14L2.93 10.472L11.333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* Выполненные задания (показываются внизу) */}
                    {completedTasks.length > 0 && (
                      <>
                        {completedTasks.map((task) => (
                          <div
                            key={task.id}
                            className="border border-[#00000033] rounded-lg p-3 bg-gray-50 hover:shadow-md transition"
                          >
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => handleToggleTask(task.id, false)}
                                className="mt-0.5 flex-shrink-0 w-5 h-5 border-2 border-green-500 rounded-full bg-green-500 flex items-center justify-center transition-colors hover:bg-green-600"
                                aria-label="Вернуть в активные"
                              >
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] max-[1599px]:text-[13px] font-forum text-[#00000060] line-through">
                                  {getTaskTitle(task)}
                                </p>
                              </div>
                              <button
                                onClick={() => handleEditTask(task)}
                                className="mt-0.5 p-1 text-[#00000080] hover:text-black transition-colors cursor-pointer flex-shrink-0"
                                aria-label="Редактировать"
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M11.333 2.00001C11.5084 1.82475 11.7163 1.68596 11.9447 1.59219C12.1731 1.49843 12.4173 1.45166 12.6637 1.45468C12.9101 1.4577 13.1531 1.51045 13.3787 1.60982C13.6043 1.70919 13.8078 1.85316 13.9773 2.03335C14.1469 2.21354 14.2792 2.42619 14.3668 2.65889C14.4544 2.89159 14.4954 3.13978 14.4873 3.38868C14.4792 3.63758 14.4222 3.88238 14.3197 4.10868C14.2172 4.33498 14.0714 4.53838 13.8913 4.70668L5.528 13.07L2 14L2.93 10.472L11.333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {activeTasks.length === 0 && completedTasks.length === 0 && (
                      <p className="text-[14px] font-forum font-light text-[#00000080] py-4 text-center">
                        Нет заданий
                      </p>
                    )}
                  </div>

                  {/* Футер колонки с кнопкой */}
                  <div className="px-3 py-3 border-t border-[#00000033] flex-shrink-0">
                    <button
                      onClick={() => handleCreateTask(group.id)}
                      className="w-full px-3 py-2 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[14px] max-[1599px]:text-[13px] font-forum"
                    >
                      + Добавить карточку
                    </button>
                  </div>
                </div>
              );
            })}
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
                      className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
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
      const currentLang = getInitialLanguage();
      const translations = getTranslation(currentLang);
      setError(translations.organizer.loadError);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && user.role === 'organizer') {
      loadData();
    } else if (user && user.role !== 'organizer') {
      // Если пользователь не организатор, перенаправляем
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, loadData]);

  // Восстанавливаем открытые вкладки после загрузки данных
  const hasRestoredTabsRef = useRef(false);
  useEffect(() => {
    if (weddings.length > 0 && openTabs.length > 0 && !selectedWedding && !hasRestoredTabsRef.current) {
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

      // Восстанавливаем последнюю активную вкладку
      if (lastActiveTabId && validTabs.some(tab => tab.weddingId === lastActiveTabId)) {
        const activeTab = validTabs.find(tab => tab.weddingId === lastActiveTabId);
        if (activeTab) {
          loadWeddingDetails(activeTab.weddingId);
        }
        } else if (validTabs.length > 0) {
        // Если последняя активная вкладка не найдена, открываем первую
        loadWeddingDetails(validTabs[0].weddingId);
      } else {
        // Если нет открытых вкладок, переключаемся на ивенты
        setViewMode('weddings');
      }
    }
  }, [weddings.length]); // Запускаем только когда загружены свадьбы

  const loadWeddingDetails = async (weddingId: string) => {
    setLoading(true);
    try {
      const wedding = await weddingService.getWeddingById(weddingId);
      if (!wedding) {
        const currentLang = getInitialLanguage();
        const translations = getTranslation(currentLang);
        setError(translations.organizer.loadError);
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
      const coupleName = currentLanguage === 'en' && wedding.couple_name_1_en && wedding.couple_name_2_en
        ? `${wedding.couple_name_1_en} & ${wedding.couple_name_2_en}`
        : currentLanguage === 'ua' && wedding.couple_name_1_ru && wedding.couple_name_2_ru
        ? `${wedding.couple_name_1_ru} & ${wedding.couple_name_2_ru}`
        : `${wedding.couple_name_1_ru || wedding.couple_name_1_en || ''} & ${wedding.couple_name_2_ru || wedding.couple_name_2_en || ''}`;

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
      const currentLang = getInitialLanguage();
      const translations = getTranslation(currentLang);
      setError(translations.organizer.loadError);
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

  const handleEditWedding = (wedding: Wedding) => {
    setEditingWedding(wedding);
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
        const coupleName = currentLanguage === 'en' && weddingData.couple_name_1_en && weddingData.couple_name_2_en
          ? `${weddingData.couple_name_1_en} & ${weddingData.couple_name_2_en}`
          : currentLanguage === 'ua' && weddingData.couple_name_1_ru && weddingData.couple_name_2_ru
          ? `${weddingData.couple_name_1_ru} & ${weddingData.couple_name_2_ru}`
          : `${weddingData.couple_name_1_ru || weddingData.couple_name_1_en || ''} & ${weddingData.couple_name_2_ru || weddingData.couple_name_2_en || ''}`;

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
    } catch (err: any) {
      console.error('Error creating client:', err);
      setError(err.message || 'Ошибка при создании клиента');
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
          setError(t.organizer.updateError);
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
          setError(t.organizer.createError);
          return;
        }
      }

      setShowTaskModal(false);
      setEditingTask(null);
      await loadWeddingDetails(selectedWedding.id);
    } catch (err) {
      console.error('Error saving task:', err);
      const currentLang = getInitialLanguage();
      const translations = getTranslation(currentLang);
      setError(translations.organizer.saveError);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedWedding) return;

    if (!confirm(t.organizer.deleteTaskConfirm)) {
      return;
    }

    try {
      const success = await taskService.deleteTask(taskId, selectedWedding.id);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
      } else {
        setError(t.organizer.deleteError + ' ' + t.organizer.tasks.toLowerCase());
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(t.organizer.deleteError + ' ' + t.organizer.tasks.toLowerCase());
    }
  };

  // Обработчики drag and drop для заданий
  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', taskId);
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

    if (!confirm(t.organizer.deleteDocumentConfirm)) {
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
        setError(t.organizer.deleteError + ' ' + t.organizer.documents.toLowerCase());
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(t.organizer.deleteError + ' ' + t.organizer.documents.toLowerCase());
    }
  };

  // Обработчики для презентации
  const handleDeletePresentation = async () => {
    if (!selectedWedding) return;

    if (!confirm(t.organizer.deletePresentationConfirm)) {
      return;
    }

    try {
      const success = await presentationService.deletePresentation(selectedWedding.id);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
      } else {
        setError(t.organizer.deleteError + ' ' + t.organizer.presentation.toLowerCase());
      }
    } catch (err) {
      console.error('Error deleting presentation:', err);
      setError(t.organizer.deleteError + ' ' + t.organizer.presentation.toLowerCase());
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

      // Формируем название презентации в зависимости от языка
      const coupleName1 = currentLanguage === 'en' && selectedWedding.couple_name_1_en 
        ? selectedWedding.couple_name_1_en 
        : currentLanguage === 'ua' && selectedWedding.couple_name_1_ru 
        ? selectedWedding.couple_name_1_ru 
        : selectedWedding.couple_name_1_ru || selectedWedding.couple_name_1_en || '';
      const coupleName2 = currentLanguage === 'en' && selectedWedding.couple_name_2_en 
        ? selectedWedding.couple_name_2_en 
        : currentLanguage === 'ua' && selectedWedding.couple_name_2_ru 
        ? selectedWedding.couple_name_2_ru 
        : selectedWedding.couple_name_2_ru || selectedWedding.couple_name_2_en || '';
      
      const presentation: Presentation = {
        type: 'wedding',
        title: `${t.organizer.weddingPresentation}: ${coupleName1} & ${coupleName2}`,
        sections,
      };

      const success = await presentationService.updatePresentation(selectedWedding.id, presentation);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
        setShowPresentationModal(false);
      } else {
        setError(t.organizer.loadError);
      }
    } catch (err) {
      console.error('Error uploading presentation:', err);
      setError(t.organizer.loadError);
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
        setError(t.organizer.saveError);
        return;
      }

      setShowDocumentModal(false);
      setEditingDocument(null);
      await loadWeddingDetails(selectedWedding.id);
    } catch (err) {
      console.error('Error saving document:', err);
      const currentLang = getInitialLanguage();
      const translations = getTranslation(currentLang);
      setError(translations.organizer.saveError);
    }
  };

  const stats = {
    totalWeddings: weddings.length,
    totalClients: clients.length,
    totalTasks: selectedWedding?.tasks?.length || 0,
    completedTasks: selectedWedding?.tasks?.filter(t => t.status === 'completed').length || 0,
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
            <div>
              <h1 className="text-[24px] sm:text-[28px] md:text-[32px] lg:text-[36px] max-[1599px]:text-[28px] lg:max-[1599px]:text-[26px] min-[1300px]:max-[1599px]:text-[30px] font-forum leading-tight text-black">Панель организатора</h1>
              <p className="text-[14px] sm:text-[16px] md:text-[18px] max-[1599px]:text-[16px] lg:max-[1599px]:text-[15px] min-[1300px]:max-[1599px]:text-[16px] font-forum font-light text-[#00000080] leading-tight mt-1">Добро пожаловать, {user?.name}</p>
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
      <main className="flex-1 overflow-auto px-3 sm:px-4 md:px-8 lg:px-12 xl:px-[60px] py-4 sm:py-5 md:py-6 lg:py-8 font-forum">
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
            currentLanguage={currentLanguage}
            t={t}
          />
        )}

        {viewMode === 'weddings' && (
          <div className="h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-5 md:mb-6 flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCreateClient}
                  className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[14px] sm:text-[16px] md:text-[18px] max-[1599px]:text-[16px] font-forum w-full sm:w-auto"
                >
                  + Создать клиента
                </button>
                <button
                  onClick={handleCreateWedding}
                  className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[14px] sm:text-[16px] md:text-[18px] max-[1599px]:text-[16px] font-forum w-full sm:w-auto"
                >
                  + Добавить ивент
                </button>
              </div>
            </div>

            {weddings.length > 0 ? (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {weddings.map((wedding) => {
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
                    if (currentLanguage === 'en' && wedding.country_en) return wedding.country_en;
                    if (currentLanguage === 'ru' && wedding.country_ru) return wedding.country_ru;
                    if (currentLanguage === 'ua' && wedding.country_ua) return wedding.country_ua;
                    return wedding.country || wedding.country_en || wedding.country_ru || wedding.country_ua || '';
                  };

                  return (
                    <div
                      key={wedding.id}
                      onClick={() => loadWeddingDetails(wedding.id)}
                      className="bg-white border border-[#00000033] rounded-lg p-4 sm:p-5 md:p-6 hover:shadow-lg transition cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[18px] sm:text-[20px] md:text-[22px] max-[1599px]:text-[20px] font-forum font-bold text-black mb-3 break-words">
                            {wedding.project_name || `${wedding.couple_name_1_ru || wedding.couple_name_1_en || ''} & ${wedding.couple_name_2_ru || wedding.couple_name_2_en || ''}`}
                          </h3>
                          
                          {/* Информация как в деталях свадьбы на странице клиента */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div>
                              <p className="text-[12px] sm:text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mb-1">
                                {t.organizer.weddingDate}
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
                                {t.organizer.place}
                              </p>
                              <p className="text-[16px] sm:text-[18px] max-[1599px]:text-[17px] font-forum font-bold text-black break-words">
                                {wedding.venue}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-[12px] sm:text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mb-1">
                                {t.organizer.guestCount}
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
                                до свадьбы
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
                <h2 className="text-[28px] sm:text-[32px] md:text-[36px] lg:text-[54px] max-[1599px]:text-[40px] lg:max-[1599px]:text-[36px] min-[1300px]:max-[1599px]:text-[42px] font-forum leading-tight text-black break-words">
                  {currentLanguage === 'en' && selectedWedding.couple_name_1_en && selectedWedding.couple_name_2_en
                    ? `${selectedWedding.couple_name_1_en} & ${selectedWedding.couple_name_2_en}`
                    : currentLanguage === 'ua' && selectedWedding.couple_name_1_ru && selectedWedding.couple_name_2_ru
                    ? `${selectedWedding.couple_name_1_ru} & ${selectedWedding.couple_name_2_ru}`
                    : `${selectedWedding.couple_name_1_ru || selectedWedding.couple_name_1_en || ''} & ${selectedWedding.couple_name_2_ru || selectedWedding.couple_name_2_en || ''}`}
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
                  <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">{t.organizer.weddingDate}</p>
                  <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">
                    {new Date(selectedWedding.wedding_date).toLocaleDateString(currentLanguage === 'en' ? 'en-US' : currentLanguage === 'ua' ? 'uk-UA' : 'ru-RU')}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">{t.organizer.country}</p>
                  <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">
                    {currentLanguage === 'en' && selectedWedding.country_en ? selectedWedding.country_en :
                     currentLanguage === 'ru' && selectedWedding.country_ru ? selectedWedding.country_ru :
                     currentLanguage === 'ua' && selectedWedding.country_ua ? selectedWedding.country_ua :
                     selectedWedding.country || selectedWedding.country_en || selectedWedding.country_ru || selectedWedding.country_ua || ''}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">{t.organizer.place}</p>
                  <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">{selectedWedding.venue}</p>
                </div>
                <div>
                  <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">{t.organizer.guestCount}</p>
                  <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1">{selectedWedding.guest_count}</p>
                </div>
                {selectedWedding.client && (
                  <div>
                    <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">{t.organizer.client}</p>
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
                  <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black">{t.organizer.tasks}</h3>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000060] mt-1">
                    Перетащите элементы для изменения порядка
                  </p>
                </div>
                <button
                  onClick={handleCreateTask}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
                >
                  + {t.organizer.addTask}
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
                      className={`border border-[#00000033] rounded-lg p-4 flex justify-between items-start hover:shadow-md transition cursor-move ${
                        draggedTaskId === task.id ? 'opacity-50' : ''
                      }`}
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
                              ? t.organizer.taskStatus.completed
                              : task.status === 'in_progress'
                              ? t.organizer.taskStatus.inProgress
                              : t.organizer.taskStatus.pending}
                          </span>
                          {task.due_date && (
                            <span className="text-[14px] font-forum font-light text-[#00000080]">
                              {t.organizer.dueDate}: {new Date(task.due_date).toLocaleDateString(currentLanguage === 'en' ? 'en-US' : currentLanguage === 'ua' ? 'uk-UA' : 'ru-RU')}
                            </span>
                          )}
                        </div>
                        <h4 className="text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-2">
                          {currentLanguage === 'en' && task.title_en ? task.title_en :
                           currentLanguage === 'ru' && task.title_ru ? task.title_ru :
                           currentLanguage === 'ua' && task.title_ua ? task.title_ua :
                           task.title || task.title_en || task.title_ru || task.title_ua || ''}
                        </h4>
                        {task.link && (() => {
                          // Выбираем текст ссылки в зависимости от текущего языка
                          const linkText = currentLanguage === 'ua' && task.link_text_ua 
                            ? task.link_text_ua 
                            : currentLanguage === 'ru' && task.link_text_ru 
                            ? task.link_text_ru 
                            : currentLanguage === 'en' && task.link_text_en 
                            ? task.link_text_en 
                            : task.link_text;
                          
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
                          {t.common.edit}
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer text-[16px] font-forum"
                        >
                          {t.common.delete}
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
                  <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black">{t.organizer.documents}</h3>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000060] mt-1">
                    Перетащите элементы для изменения порядка (закрепленные и незакрепленные отдельно)
                  </p>
                </div>
                <button
                  onClick={handleCreateDocument}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
                >
                  + {t.organizer.addDocument}
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
                            {currentLanguage === 'en' && doc.name_en ? doc.name_en :
                             currentLanguage === 'ru' && doc.name_ru ? doc.name_ru :
                             currentLanguage === 'ua' && doc.name_ua ? doc.name_ua :
                             doc.name || doc.name_en || doc.name_ru || doc.name_ua || ''}
                          </h4>
                          {doc.pinned && (
                            <span className="px-2 py-1 text-[14px] font-forum bg-yellow-100 text-yellow-800 rounded">
                              {t.organizer.pinned}
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
                            {t.organizer.openLink}
                          </a>
                        )}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="px-3 py-1 bg-white border border-[#00000033] text-black rounded hover:bg-gray-50 transition-colors cursor-pointer text-[16px] font-forum"
                        >
                          {t.common.edit}
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer text-[16px] font-forum"
                        >
                          {t.common.delete}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[18px] font-forum font-light text-[#00000080]">{t.organizer.noDocuments}</p>
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
                      {t.organizer.deletePresentation}
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
                    ? `${t.organizer.type}: ${t.organizer.weddingPresentation} - "${selectedWedding.presentation.title}"`
                    : `${t.organizer.type}: ${t.organizer.defaultCompanyPresentation}`}
                </p>
                {selectedWedding.presentation && selectedWedding.presentation.sections && (
                  <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">
                    {t.organizer.sections}: {selectedWedding.presentation.sections.length}
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
