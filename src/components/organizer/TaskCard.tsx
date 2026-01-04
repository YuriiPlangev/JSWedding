import React, { memo } from 'react';
import type { Task, OrganizerTaskLog } from '../../types';
import { getActionText, formatDateTime } from '../../utils/dateUtils';
import { getPriorityText, getPriorityClasses } from '../../utils/priorityUtils';

interface TaskCardProps {
  task: Task;
  taskTitle: string;
  isCompleted: boolean;
  isEditing: boolean;
  editingTaskText: string;
  expandedTaskLogs: Set<string>;
  taskLogs: OrganizerTaskLog[];
  isLoadingLogs: boolean;
  onToggle: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditingTextChange: (text: string) => void;
  onToggleLogs: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

const TaskCard = memo(({
  task,
  taskTitle,
  isCompleted,
  isEditing,
  editingTaskText,
  expandedTaskLogs,
  taskLogs,
  isLoadingLogs,
  onToggle,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onEditingTextChange,
  onToggleLogs,
  onDragStart,
  onDragOver,
  onDragEnd,
}: TaskCardProps) => {
  const showLogs = expandedTaskLogs.has(task.id);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`border border-[#00000033] rounded-lg p-3 bg-white hover:shadow-md transition cursor-move ${
        isCompleted ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(!isCompleted)}
          className={`flex-shrink-0 w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors ${
            isCompleted
              ? 'border-green-500 bg-green-500 hover:bg-green-600'
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

        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editingTaskText}
              onChange={(e) => onEditingTextChange(e.target.value)}
              onBlur={() => {
                if (editingTaskText.trim()) {
                  onSaveEdit();
                } else {
                  onCancelEdit();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                } else if (e.key === 'Escape') {
                  onCancelEdit();
                }
              }}
              autoFocus
              className="flex-1 px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum text-[14px] max-[1599px]:text-[13px] bg-white"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p
                  className={`text-[14px] max-[1599px]:text-[13px] font-forum cursor-pointer ${
                    isCompleted ? 'text-[#00000060] line-through' : 'text-black'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  {taskTitle}
                </p>
                {task.priority && (
                  <span className={getPriorityClasses(task.priority)}>
                    {getPriorityText(task.priority)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLogs();
                }}
                className={`p-1 transition-colors cursor-pointer flex-shrink-0 ${
                  showLogs
                    ? 'text-black'
                    : 'text-[#00000080] hover:text-black'
                }`}
                aria-label="Показать логи"
                title="История изменений"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 5.33333V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1 text-[#00000080] hover:text-black transition-colors cursor-pointer flex-shrink-0"
                aria-label="Редактировать"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.333 2.00001C11.5084 1.82475 11.7163 1.68596 11.9447 1.59219C12.1731 1.49843 12.4173 1.45166 12.6637 1.45468C12.9101 1.4577 13.1531 1.51045 13.3787 1.60982C13.6043 1.70919 13.8078 1.85316 13.9773 2.03335C14.1469 2.21354 14.2792 2.42619 14.3668 2.65889C14.4544 2.89159 14.4954 3.13978 14.4873 3.38868C14.4792 3.63758 14.4222 3.88238 14.3197 4.10868C14.2172 4.33498 14.0714 4.53838 13.8913 4.70668L5.528 13.07L2 14L2.93 10.472L11.333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Логи заданий */}
      {showLogs && (
        <div className="mt-3 pt-3 border-t border-[#00000020]">
          {isLoadingLogs ? (
            <p className="text-[12px] font-forum text-[#00000060]">Загрузка логов...</p>
          ) : taskLogs.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[12px] font-forum font-bold text-[#00000080] mb-2">История изменений:</p>
              {taskLogs.map((log) => (
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
    </div>
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;

