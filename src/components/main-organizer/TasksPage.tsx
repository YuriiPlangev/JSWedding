import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { User, Task, TaskGroup } from '../../types';
import { taskService } from '../../services/weddingService';
import { OrganizerTaskModal } from '../modals';
import { TaskColumn, ScrollbarStyles } from '../organizer';
import { useTaskGroups, useTaskLogs, useTaskDragAndDrop, useGroupDragAndDrop } from '../../hooks';
import { hexToHsl, hslToHex } from '../../utils/colorUtils';
import { splitTasksByStatus } from '../../utils/taskUtils';

interface TasksPageProps {
  user: User | null;
  viewMode: string;
}

const TasksPage = ({ user, viewMode }: TasksPageProps) => {
  // Используем кастомные хуки
  const { taskGroups, loadingTasks, loadOrganizerTasks, setTaskGroups } = useTaskGroups(user?.id || null);
  
  // Локальное состояние для ошибок
  const [localError, setLocalError] = useState<string | null>(null);
  
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
  const [creatingTaskGroupId, setCreatingTaskGroupId] = useState<string | null | 'unsorted'>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskAssignedOrganizerId, setNewTaskAssignedOrganizerId] = useState<string | null>(null);
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
          setLocalError('Не удалось обновить блок заданий');
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
          setLocalError('Не удалось создать блок заданий');
          return;
        }
        // Для нового блока нужно перезагрузить данные, чтобы получить ID
        await loadOrganizerTasks();
      }

      setShowTaskGroupModal(false);
      setEditingTaskGroup(null);
      setLocalError(null);
    } catch (err) {
      console.error('Error saving task group:', err);
      // При ошибке перезагружаем данные для отката изменений
      await loadOrganizerTasks();
      setLocalError('Ошибка при сохранении блока заданий');
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
        setLocalError(null);
      } else {
        setLocalError('Не удалось удалить блок заданий');
      }
    } catch (err) {
      console.error('Error deleting task group:', err);
      setLocalError('Ошибка при удалении блока заданий');
    }
  };


  const handleCreateTask = (groupId: string | null) => {
    // Для несортированных задач используем специальный маркер
    setCreatingTaskGroupId(groupId === null ? 'unsorted' : groupId);
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
        setLocalError('Не удалось обновить задание');
        return;
      }

      setEditingTaskId(null);
      setEditingTaskText('');
      setLocalError(null);
      await loadOrganizerTasks();
    } catch (err) {
      console.error('Error updating task:', err);
      setLocalError('Ошибка при обновлении задания');
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
        setLocalError('Не удалось удалить задание');
      } else {
        setLocalError(null);
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
      setLocalError('Ошибка при удалении задания');
    }
  };

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'wedding_id' | 'organizer_id' | 'task_group_id'>) => {
    if (!user?.id || !selectedGroupId) return;

    try {
      if (editingOrganizerTask) {
        const result = await taskService.updateOrganizerTask(editingOrganizerTask.id, taskData);
        if (!result) {
          setLocalError('Не удалось обновить задание');
          return;
        }
      } else {
        const result = await taskService.createOrganizerTask({
          ...taskData,
          organizer_id: user.id,
          task_group_id: selectedGroupId,
        });
        if (!result) {
          setLocalError('Не удалось создать задание');
          return;
        }
      }

      setShowOrganizerTaskModal(false);
      setEditingOrganizerTask(null);
      setSelectedGroupId(null);
      setLocalError(null);
      await loadOrganizerTasks();
    } catch (err) {
      console.error('Error saving task:', err);
      setLocalError('Ошибка при сохранении задания');
    }
  };


  // Функция для сохранения inline задачи
  const handleSaveInlineTask = async (groupId: string | null, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!user?.id || !newTaskText.trim()) return;

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
      assigned_organizer_id: newTaskAssignedOrganizerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Сразу обновляем локальное состояние
    setTaskGroups(prevGroups =>
      prevGroups.map(({ group, tasks, isUnsorted }) => {
        const currentGroupId = group?.id || null;
        // Для несортированных задач groupId === null и isUnsorted === true
        if ((groupId === null && isUnsorted && currentGroupId === null) || currentGroupId === groupId) {
          return { group, tasks: [...tasks, optimisticTask], isUnsorted };
        }
        return { group, tasks, isUnsorted };
      })
    );

    // Очищаем текст и оставляем input открытым для следующей задачи
    setNewTaskText('');
    
    // Возвращаем фокус на input сразу
    setTimeout(() => {
      const isCreating = (groupId === null && creatingTaskGroupId === 'unsorted') || creatingTaskGroupId === groupId;
      if (isCreating && newTaskInputRef.current) {
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
        assigned_organizer_id: newTaskAssignedOrganizerId,
        organizer_id: user.id,
        task_group_id: groupId,
      });

      if (!result) {
        // Если сохранение не удалось, удаляем оптимистично добавленную задачу
        setTaskGroups(prevGroups =>
          prevGroups.map(({ group, tasks, isUnsorted }) => {
            const currentGroupId = group?.id || null;
            // Для несортированных задач groupId === null и isUnsorted === true
            if ((groupId === null && isUnsorted && currentGroupId === null) || currentGroupId === groupId) {
              return { group, tasks: tasks.filter(t => t.id !== optimisticTask.id), isUnsorted };
            }
            return { group, tasks, isUnsorted };
          })
        );
        setLocalError('Не удалось создать задание');
        return;
      }

      // Заменяем временную задачу на реальную с сервера
      setTaskGroups(prevGroups =>
        prevGroups.map(({ group, tasks, isUnsorted }) => {
          const currentGroupId = group?.id || null;
          // Для несортированных задач groupId === null и isUnsorted === true
          if ((groupId === null && isUnsorted && currentGroupId === null) || currentGroupId === groupId) {
            return { 
              group, 
              tasks: tasks.map(t => t.id === optimisticTask.id ? result : t),
              isUnsorted
            };
          }
          return { group, tasks, isUnsorted };
        })
      );
      setLocalError(null);
    } catch (err) {
      console.error('Error saving inline task:', err);
      // Удаляем оптимистично добавленную задачу при ошибке
      setTaskGroups(prevGroups =>
        prevGroups.map(({ group, tasks, isUnsorted }) => {
          const currentGroupId = group?.id || null;
          // Для несортированных задач groupId === null и isUnsorted === true
          if ((groupId === null && isUnsorted && currentGroupId === null) || currentGroupId === groupId) {
            return { group, tasks: tasks.filter(t => t.id !== optimisticTask.id), isUnsorted };
          }
          return { group, tasks, isUnsorted };
        })
      );
      setLocalError('Ошибка при сохранении задания');
    }
  };

  // Автофокус на input при создании новой задачи
  useEffect(() => {
    if (creatingTaskGroupId !== null && newTaskInputRef.current) {
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
      {localError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-forum text-[16px]">{localError}</p>
          <button
            onClick={() => setLocalError(null)}
            className="mt-2 text-[16px] text-red-600 hover:text-red-800 font-forum cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      )}
      
      {/* Блоки заданий в Kanban-стиле */}
      {taskGroups.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto -mx-4 px-4 items-start task-blocks-scroll flex-1" style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
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
                  setNewTaskAssignedOrganizerId(null);
                }}
                newTaskAssignedOrganizerId={newTaskAssignedOrganizerId}
                onNewTaskAssignedOrganizerChange={setNewTaskAssignedOrganizerId}
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
            className="flex-shrink-0 w-[240px] sm:w-[280px] h-[80px] border border-[#00000033] rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center text-[12px] max-[1599px]:text-[11px] font-forum text-[#00000080] hover:text-black border-dashed"
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

export default TasksPage;

