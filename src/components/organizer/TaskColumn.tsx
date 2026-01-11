import React, { memo, useState, useRef, useEffect } from 'react';
import type { Task, TaskGroup, OrganizerTaskLog, User } from '../../types';
import { getTaskTitle, getGroupName } from '../../utils/taskUtils';
import { getActionText, formatDateTime } from '../../utils/dateUtils';
import { getPriorityText, getPriorityClasses } from '../../utils/priorityUtils';
import { organizerService } from '../../services/weddingService';

interface TaskColumnProps {
  group: TaskGroup | null;
  tasks: Task[];
  isUnsorted?: boolean;
  activeTasks: Task[];
  completedTasks: Task[];
  isCompletedExpanded: boolean;
  backgroundColor: string;
  isMenuOpen: boolean;
  editingTaskId: string | null;
  editingTaskText: string;
  expandedTaskLogs: Set<string>;
  taskLogs: Record<string, OrganizerTaskLog[]>;
  loadingLogs: Record<string, boolean>;
  initiallyCompletedTaskIds: Set<string>;
  creatingTaskGroupId: string | null;
  newTaskText: string;
  newTaskPriority?: 'low' | 'medium' | 'high';
  newTaskAssignedOrganizerId?: string | null;
  onNewTaskPriorityChange?: (priority: 'low' | 'medium' | 'high') => void;
  onNewTaskAssignedOrganizerChange?: (organizerId: string | null) => void;
  newTaskInputRef: React.RefObject<HTMLInputElement | null>;
  onToggleCompleted: (groupId: string | null) => void;
  onTaskToggle: (taskId: string, checked: boolean) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onSaveInlineEdit: (taskId: string) => void;
  onCancelInlineEdit: () => void;
  onEditingTaskTextChange: (text: string) => void;
  onToggleTaskLogs: (taskId: string) => void;
  onTaskDragStart: (e: React.DragEvent, taskId: string, groupId: string | null) => void;
  onTaskDragOver: (e: React.DragEvent) => void;
  onTaskDragEnd: () => void;
  onGroupMenuClick: (groupId: string | null) => void;
  onEditGroup: (group: TaskGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onSaveInlineTask: (groupId: string | null, e?: React.MouseEvent | React.KeyboardEvent) => void;
  onNewTaskTextChange: (text: string) => void;
  onCancelCreatingTask: () => void;
  onCreateTask?: (groupId: string | null) => void;
  onGroupDragStart?: (e: React.DragEvent, groupId: string) => void;
  onGroupDragOver?: (e: React.DragEvent) => void;
  onGroupDrop?: (e: React.DragEvent, groupId: string) => void;
  onGroupDragEnd?: () => void;
  onTaskDropOnGroup?: (e: React.DragEvent, groupId: string | null) => void;
  draggedGroupId?: string | null;
  draggedTaskId?: string | null;
}

const TaskColumn = memo(({
  group,
  isUnsorted = false,
  activeTasks,
  completedTasks,
  isCompletedExpanded,
  backgroundColor,
  isMenuOpen,
  editingTaskId,
  editingTaskText,
  expandedTaskLogs,
  taskLogs,
  loadingLogs,
  creatingTaskGroupId,
  newTaskText,
  newTaskPriority = 'medium',
  newTaskAssignedOrganizerId = null,
  onNewTaskPriorityChange,
  onNewTaskAssignedOrganizerChange,
  newTaskInputRef,
  onToggleCompleted,
  onTaskToggle,
  onEditTask,
  onDeleteTask,
  onSaveInlineEdit,
  onCancelInlineEdit,
  onEditingTaskTextChange,
  onToggleTaskLogs,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDragEnd,
  onGroupMenuClick,
  onEditGroup,
  onDeleteGroup,
  onSaveInlineTask,
  onNewTaskTextChange,
  onCancelCreatingTask,
  onCreateTask,
  onGroupDragStart,
  onGroupDragOver,
  onGroupDrop,
  onGroupDragEnd,
  onTaskDropOnGroup,
  draggedGroupId,
  draggedTaskId,
}: TaskColumnProps) => {
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showOrganizerDropdown, setShowOrganizerDropdown] = useState(false);
  const [organizers, setOrganizers] = useState<User[]>([]);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const organizerDropdownRef = useRef<HTMLDivElement>(null);
  
  const groupId = group?.id || null;
  const isUnsortedGroup = isUnsorted || false;
  const groupName = getGroupName(group);

  // Загрузка списка организаторов
  useEffect(() => {
    const loadOrganizers = async () => {
      const data = await organizerService.getAllOrganizers();
      setOrganizers(data);
    };
    loadOrganizers();
  }, []);

  // Закрытие выпадающих списков при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setShowPriorityDropdown(false);
      }
      if (organizerDropdownRef.current && !organizerDropdownRef.current.contains(event.target as Node)) {
        setShowOrganizerDropdown(false);
      }
    };

    if (showPriorityDropdown || showOrganizerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPriorityDropdown, showOrganizerDropdown]);

  return (
    <div
      key={groupId || 'unsorted'}
      draggable={!isUnsortedGroup}
      onDragStart={!isUnsortedGroup && groupId && onGroupDragStart
        ? (e) => onGroupDragStart(e, groupId)
        : undefined}
      onDragOver={onGroupDragOver}
      onDrop={(e) => {
        if (draggedTaskId && onTaskDropOnGroup) {
          onTaskDropOnGroup(e, groupId);
        } else if (draggedGroupId && groupId && onGroupDrop) {
          onGroupDrop(e, groupId);
        }
      }}
      onDragEnd={() => {
        if (draggedTaskId) {
          onTaskDragEnd();
        } else if (draggedGroupId && onGroupDragEnd) {
          onGroupDragEnd();
        }
      }}
      className={`flex-shrink-0 w-[240px] sm:w-[280px] border border-[#00000033] rounded-lg flex flex-col transition-opacity ${
        !isUnsortedGroup && groupId && draggedGroupId === groupId
          ? 'opacity-50 cursor-grabbing'
          : 'cursor-default hover:shadow-md'
      }`}
      style={{
        backgroundColor,
        maxHeight: 'calc(100vh - 200px)',
        height: 'auto'
      }}
    >
      {/* Заголовок блока */}
      <div className="px-4 py-3 border-b border-[#00000033] flex-shrink-0 flex items-center justify-between relative">
        <h3 className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black">
          {groupName}
        </h3>
        {!isUnsortedGroup && groupId && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGroupMenuClick(isMenuOpen ? null : groupId);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onDragStart={(e) => e.stopPropagation()}
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
                  onClick={() => onGroupMenuClick(null)}
                />
                <div className="absolute right-0 top-8 bg-white border border-[#00000033] rounded-lg shadow-lg z-20 min-w-[120px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGroupMenuClick(null);
                      if (group) onEditGroup(group);
                    }}
                    className="w-full px-4 py-2 text-left text-[14px] font-forum text-black hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGroupMenuClick(null);
                      if (groupId) onDeleteGroup(groupId);
                    }}
                    className="w-full px-4 py-2 text-left text-[14px] font-forum text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Удалить
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Контент колонки с прокруткой */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2 task-column-scroll"
        style={{
          maxHeight: 'calc(100vh - 300px)',
          scrollbarWidth: 'thin',
          scrollbarColor: '#00000040 transparent'
        }}
      >
        {/* Активные задания */}
        {activeTasks.length > 0 && (
          <>
            {activeTasks.map((task) => {
              const isCompleted = task.status === 'completed';
              const isEditing = editingTaskId === task.id;
              const taskTitle = getTaskTitle(task);
              const assignedOrganizer = task.assigned_organizer_id 
                ? organizers.find(o => o.id === task.assigned_organizer_id)
                : null;

              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => onTaskDragStart(e, task.id, groupId)}
                  onDragOver={onTaskDragOver}
                  onDragEnd={onTaskDragEnd}
                  className={`border border-[#00000033] rounded-lg p-2 bg-white hover:shadow-md transition cursor-move relative ${
                    task.assigned_organizer_id ? 'pb-6' : ''
                  } ${isCompleted ? 'opacity-60' : ''}`}
                >
                  <div className="group relative flex items-center gap-1.5">
                    <button
                      onClick={() => onTaskToggle(task.id, !isCompleted)}
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 border-2 rounded-full flex items-center justify-center transition-opacity duration-300 ease-in-out z-10 ${
                        isCompleted
                          ? 'border-green-500 bg-green-500 hover:bg-green-600 opacity-100'
                          : 'border-[#00000080] hover:border-black bg-white opacity-0 group-hover:opacity-100'
                      }`}
                      aria-label={isCompleted ? "Отметить невыполненным" : "Отметить выполненным"}
                    >
                      {isCompleted && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>

                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-1.5 transition-all duration-300 ease-in-out group-hover:ml-7">
                        <input
                          type="text"
                          value={editingTaskText}
                          onChange={(e) => onEditingTaskTextChange(e.target.value)}
                          onBlur={() => {
                            if (editingTaskText.trim()) {
                              onSaveInlineEdit(task.id);
                            } else {
                              onCancelInlineEdit();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            } else if (e.key === 'Escape') {
                              onCancelInlineEdit();
                            }
                          }}
                          autoFocus
                          className="flex-1 px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum text-[14px] max-[1599px]:text-[13px] bg-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask(task.id);
                          }}
                          className="p-1 text-red-600 hover:text-red-700 transition-colors cursor-pointer flex-shrink-0"
                          aria-label="Удалить"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 4H14M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4M6.66667 7.33333V11.3333M9.33333 7.33333V11.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0 transition-all duration-300 ease-in-out group-hover:ml-7">
                            <p
                              className={`text-[14px] max-[1599px]:text-[13px] font-forum cursor-pointer ${
                                isCompleted ? 'text-[#00000060] line-through' : 'text-black'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditTask(task);
                              }}
                            >
                              {taskTitle}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 relative flex-shrink-0">
                            {task.priority && (
                            <span 
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                task.priority === 'high' ? 'bg-red-500' :
                                task.priority === 'medium' ? 'bg-amber-500' :
                                'bg-green-500'
                              }`}
                              title={getPriorityText(task.priority)}
                            />
                          )}
                          <div className="hidden group-hover:flex items-center gap-1 transition-all duration-700 ease-in-out">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTaskLogs(task.id);
                            }}
                              className={`p-0.5 transition-colors cursor-pointer flex-shrink-0 ${
                              expandedTaskLogs.has(task.id)
                                ? 'text-black'
                                : 'text-[#00000080] hover:text-black'
                            }`}
                            aria-label="Показать логи"
                            title="История изменений"
                          >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 5.33333V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTask(task);
                            }}
                              className="p-0.5 text-[#00000080] hover:text-black transition-colors cursor-pointer flex-shrink-0"
                            aria-label="Редактировать"
                          >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11.333 2.00001C11.5084 1.82475 11.7163 1.68596 11.9447 1.59219C12.1731 1.49843 12.4173 1.45166 12.6637 1.45468C12.9101 1.4577 13.1531 1.51045 13.3787 1.60982C13.6043 1.70919 13.8078 1.85316 13.9773 2.03335C14.1469 2.21354 14.2792 2.42619 14.3668 2.65889C14.4544 2.89159 14.4954 3.13978 14.4873 3.38868C14.4792 3.63758 14.4222 3.88238 14.3197 4.10868C14.2172 4.33498 14.0714 4.53838 13.8913 4.70668L5.528 13.07L2 14L2.93 10.472L11.333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Логи заданий */}
                  {expandedTaskLogs.has(task.id) && (
                    <div className="mt-2 pt-2 border-t border-[#00000020]">
                      {loadingLogs[task.id] ? (
                        <p className="text-[12px] font-forum text-[#00000060]">Загрузка логов...</p>
                      ) : taskLogs[task.id] && taskLogs[task.id].length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[12px] font-forum font-bold text-[#00000080] mb-2">История изменений:</p>
                          {taskLogs[task.id].map((log) => (
                            <div key={log.id} className="flex items-center gap-2 text-[12px] font-forum">
                              {log.organizer?.avatar ? (
                                <img
                                  src={log.organizer.avatar}
                                  alt={log.organizer.name}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div className={`w-6 h-6 rounded-full bg-[#00000020] flex items-center justify-center flex-shrink-0 avatar-fallback ${log.organizer?.avatar ? 'hidden' : ''}`}>
                                <span className="text-[10px] text-[#00000060]">
                                  {log.organizer?.name?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-black font-medium">
                                  {log.organizer?.name || 'Неизвестно'}
                                </span>
                                {' '}
                                <span className="text-[#00000080]">
                                  {getActionText(log.action)}
                                </span>
                              </div>
                              <span className="text-[#00000060] flex-shrink-0 text-[11px]">
                                {formatDateTime(log.created_at)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] font-forum text-[#00000060]">Нет истории изменений</p>
                      )}
                    </div>
                  )}

                  {/* Фото исполнителя справа снизу */}
                  {task.assigned_organizer_id && (
                    <div className="absolute right-1.5 bottom-1.5 flex-shrink-0">
                      {assignedOrganizer?.avatar ? (
                        <img
                          src={assignedOrganizer.avatar}
                          alt={assignedOrganizer.name || 'Исполнитель'}
                          className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                          style={{ objectPosition: 'center' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.assigned-organizer-fallback') as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className={`w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 assigned-organizer-fallback ${assignedOrganizer?.avatar ? 'hidden' : ''}`}>
                        <span className="text-[9px] text-white font-medium leading-none">
                          {assignedOrganizer?.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Inline input для создания новой задачи */}
        {((!isUnsortedGroup && groupId && creatingTaskGroupId === groupId) || (isUnsortedGroup && groupId === null && creatingTaskGroupId === 'unsorted')) && (
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
            <input
              ref={newTaskInputRef}
              type="text"
              value={newTaskText}
              onChange={(e) => onNewTaskTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                    setShowPriorityDropdown(false);
                    setShowOrganizerDropdown(false);
                  onSaveInlineTask(groupId, e);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                    setShowPriorityDropdown(false);
                    setShowOrganizerDropdown(false);
                  onCancelCreatingTask();
                }
              }}
              placeholder="Введите текст задания..."
                className="flex-1 px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white text-[14px] max-[1599px]:text-[13px]"
              autoFocus
            />
            {onNewTaskPriorityChange && (
                <div className="relative" ref={priorityDropdownRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPriorityDropdown(!showPriorityDropdown);
                    }}
                    className="flex items-center gap-1.5 px-2 py-2 border border-[#00000033] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <span 
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        newTaskPriority === 'high' ? 'bg-red-500' :
                        newTaskPriority === 'medium' ? 'bg-amber-500' :
                        'bg-green-500'
                      }`}
                    />
                  </button>
                  {showPriorityDropdown && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-[#00000033] rounded-lg shadow-lg z-50 min-w-[140px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewTaskPriorityChange('high');
                          setShowPriorityDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="text-[13px] max-[1599px]:text-[12px] font-forum">Срочно</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewTaskPriorityChange('medium');
                          setShowPriorityDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="text-[13px] max-[1599px]:text-[12px] font-forum">Средне</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewTaskPriorityChange('low');
                          setShowPriorityDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-[13px] max-[1599px]:text-[12px] font-forum">Обычно</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {onNewTaskAssignedOrganizerChange && (
                <div className="relative" ref={organizerDropdownRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOrganizerDropdown(!showOrganizerDropdown);
                    }}
                    className="flex items-center gap-1.5 px-2 py-2 border border-[#00000033] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {newTaskAssignedOrganizerId ? (
                      <>
                        {organizers.find(o => o.id === newTaskAssignedOrganizerId)?.avatar ? (
                          <img
                            src={organizers.find(o => o.id === newTaskAssignedOrganizerId)?.avatar}
                            alt={organizers.find(o => o.id === newTaskAssignedOrganizerId)?.name || ''}
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-forum text-[#00000060]">
                              {organizers.find(o => o.id === newTaskAssignedOrganizerId)?.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-dashed border-[#00000033] flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-forum text-[#00000060]">+</span>
                      </div>
                    )}
                  </button>
                  {showOrganizerDropdown && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-[#00000033] rounded-lg shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewTaskAssignedOrganizerChange(null);
                          setShowOrganizerDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-6 h-6 rounded-full border-2 border-dashed border-[#00000033] flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-forum text-[#00000060]">—</span>
                        </div>
                        <span className="text-[13px] max-[1599px]:text-[12px] font-forum">Не назначен</span>
                      </button>
                      {organizers.map((organizer) => (
                        <button
                          key={organizer.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNewTaskAssignedOrganizerChange(organizer.id);
                            setShowOrganizerDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                        >
                          {organizer.avatar ? (
                            <img
                              src={organizer.avatar}
                              alt={organizer.name}
                              className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-forum text-[#00000060]">
                                {organizer.name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <span className="text-[13px] max-[1599px]:text-[12px] font-forum">{organizer.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  setShowPriorityDropdown(false);
                  setShowOrganizerDropdown(false);
                  onSaveInlineTask(groupId, e);
                }}
                disabled={!newTaskText.trim()}
                className="px-4 py-1.5 bg-black text-white rounded-md hover:bg-[#1a1a1a] active:scale-[0.98] transition-all duration-200 cursor-pointer text-[13px] max-[1599px]:text-[12px] font-forum font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPriorityDropdown(false);
                  setShowOrganizerDropdown(false);
                  onCancelCreatingTask();
                }}
                className="px-4 py-1.5 border border-[#00000033] text-black rounded-md hover:bg-gray-50 transition-colors cursor-pointer text-[13px] max-[1599px]:text-[12px] font-forum"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Секция "Выполнено" */}
        {completedTasks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#00000033] flex-shrink-0">
            <button
              onClick={() => onToggleCompleted(groupId)}
              className="w-full flex items-center justify-between text-[14px] font-forum text-[#00000080] hover:text-black transition-colors cursor-pointer mb-2"
            >
              <span>Выполнено ({completedTasks.length})</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`transform transition-transform ${isCompletedExpanded ? 'rotate-180' : ''}`}
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {isCompletedExpanded && (
              <div className="space-y-2">
                {completedTasks.map((task) => {
                  const taskTitle = getTaskTitle(task);
                  const assignedOrganizer = task.assigned_organizer_id 
                    ? organizers.find(o => o.id === task.assigned_organizer_id)
                    : null;
                  return (
                    <div
                      key={task.id}
                      className={`border border-[#00000033] rounded-lg p-2 bg-white opacity-60 relative ${
                        task.assigned_organizer_id ? 'pb-6' : ''
                      }`}
                    >
                      <div className="group relative flex items-center gap-1.5">
                        <button
                          onClick={() => onTaskToggle(task.id, false)}
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 border-2 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out border-green-500 bg-green-500 hover:bg-green-600 opacity-100 z-10"
                          aria-label="Отметить невыполненным"
                        >
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <div className="flex-1 min-w-0 pl-7">
                            <p className="text-[14px] max-[1599px]:text-[13px] font-forum text-[#00000060] line-through cursor-pointer" onClick={() => onEditTask(task)}>
                              {taskTitle}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 relative flex-shrink-0">
                            {task.priority && (
                            <span 
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                task.priority === 'high' ? 'bg-red-500' :
                                task.priority === 'medium' ? 'bg-amber-500' :
                                'bg-green-500'
                              }`}
                              title={getPriorityText(task.priority)}
                            />
                          )}
                          <div className="hidden group-hover:flex items-center gap-1 transition-all duration-700 ease-in-out">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTaskLogs(task.id);
                            }}
                              className={`p-0.5 transition-colors cursor-pointer flex-shrink-0 ${
                              expandedTaskLogs.has(task.id)
                                ? 'text-black'
                                : 'text-[#00000080] hover:text-black'
                            }`}
                            aria-label="Показать логи"
                            title="История изменений"
                          >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 5.33333V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          </div>
                        </div>
                      </div>
                      {expandedTaskLogs.has(task.id) && (
                        <div className="mt-2 pt-2 border-t border-[#00000020]">
                          {loadingLogs[task.id] ? (
                            <p className="text-[12px] font-forum text-[#00000060]">Загрузка логов...</p>
                          ) : taskLogs[task.id] && taskLogs[task.id].length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-[12px] font-forum font-bold text-[#00000080] mb-2">История изменений:</p>
                              {taskLogs[task.id].map((log) => (
                                <div key={log.id} className="flex items-center gap-2 text-[12px] font-forum">
                                  {log.organizer?.avatar ? (
                                    <img
                                      src={log.organizer.avatar}
                                      alt={log.organizer.name}
                                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
                                          if (fallback) fallback.style.display = 'flex';
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-6 h-6 rounded-full bg-[#00000020] flex items-center justify-center flex-shrink-0 avatar-fallback ${log.organizer?.avatar ? 'hidden' : ''}`}>
                                    <span className="text-[10px] text-[#00000060]">
                                      {log.organizer?.name?.[0]?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-black font-medium">
                                      {log.organizer?.name || 'Неизвестно'}
                                    </span>
                                    {' '}
                                    <span className="text-[#00000080]">
                                      {getActionText(log.action)}
                                    </span>
                                  </div>
                                  <span className="text-[#00000060] flex-shrink-0 text-[11px]">
                                    {formatDateTime(log.created_at)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[12px] font-forum text-[#00000060]">Нет истории изменений</p>
                          )}
                        </div>
                      )}

                      {/* Фото исполнителя справа снизу */}
                      {task.assigned_organizer_id && (
                        <div className="absolute right-1.5 bottom-1.5 flex-shrink-0">
                          {assignedOrganizer?.avatar ? (
                            <img
                              src={assignedOrganizer.avatar}
                              alt={assignedOrganizer.name || 'Исполнитель'}
                              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                              style={{ objectPosition: 'center' }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = parent.querySelector('.assigned-organizer-fallback') as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div className={`w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 assigned-organizer-fallback ${assignedOrganizer?.avatar ? 'hidden' : ''}`}>
                            <span className="text-[9px] text-white font-medium leading-none">
                              {assignedOrganizer?.name?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Пустое состояние */}
        {activeTasks.length === 0 && completedTasks.length === 0 && !creatingTaskGroupId && (
          <p className="text-[14px] font-forum font-light text-[#00000080] py-4 text-center">
            Нет заданий
          </p>
        )}
      </div>

      {/* Кнопка добавления карточки */}
      {((!isUnsortedGroup && groupId) || (isUnsortedGroup && groupId === null)) && (
        <div className="px-3 py-3 border-t border-[#00000033] flex-shrink-0">
          <button
            onClick={() => {
              if (onCreateTask) {
                onCreateTask(groupId);
              }
            }}
            className="w-full px-3 py-2 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[14px] max-[1599px]:text-[13px] font-forum"
          >
            + Добавить карточку
          </button>
        </div>
      )}
    </div>
  );
});

TaskColumn.displayName = 'TaskColumn';

export default TaskColumn;

