import { useMemo } from 'react';
import type { Task, User } from '../../types';
import { getPriorityText } from '../../utils/priorityUtils';
import { formatDateTime } from '../../utils/dateUtils';

interface TaskViewModalProps {
  task: Task | null;
  assignedOrganizer?: User | null;
  onClose: () => void;
  onEdit?: () => void;
}

const TaskViewModal = ({ task, assignedOrganizer, onClose, onEdit }: TaskViewModalProps) => {
  if (!task) return null;

  const priorityColor = useMemo(() => {
    if (task.priority === 'high') return 'bg-red-500';
    if (task.priority === 'medium') return 'bg-amber-500';
    return 'bg-green-500';
  }, [task.priority]);

  const statusText = useMemo(() => {
    if (task.status === 'completed') return 'Выполнено';
    if (task.status === 'in_progress') return 'В работе';
    return 'Ожидает выполнения';
  }, [task.status]);

  const statusColor = useMemo(() => {
    if (task.status === 'completed') return 'text-green-600';
    if (task.status === 'in_progress') return 'text-blue-600';
    return 'text-gray-600';
  }, [task.status]);

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4" 
      style={{ animation: 'modal-backdrop-fade-in 0.3s ease-out forwards' }}
      onClick={onClose}
    >
      <div 
        className="bg-[#eae6db] border border-[#00000033] rounded-lg max-w-lg w-full" 
        style={{ animation: 'modal-content-scale-in 0.3s ease-out forwards' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-[28px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              Информация о задании
            </h2>
            <button 
              onClick={onClose} 
              className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Описание задания */}
            <div>
              <label className="block text-[12px] font-forum text-[#00000080] mb-2">
                Описание
              </label>
              <p className="text-[16px] max-[1599px]:text-[14px] font-forum text-black">
                {task.title_ru || task.title || task.title_en || task.title_ua || 'Нет описания'}
              </p>
            </div>

            {/* Статус */}
            <div>
              <label className="block text-[12px] font-forum text-[#00000080] mb-2">
                Статус
              </label>
              <span className={`inline-block px-3 py-1 rounded-md text-[14px] max-[1599px]:text-[13px] font-forum ${statusColor}`}>
                {statusText}
              </span>
            </div>

            {/* Приоритет */}
            {task.priority && (
              <div>
                <label className="block text-[12px] font-forum text-[#00000080] mb-2">
                  Приоритет
                </label>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${priorityColor}`} />
                  <span className="text-[14px] max-[1599px]:text-[13px] font-forum text-black">
                    {getPriorityText(task.priority)}
                  </span>
                </div>
              </div>
            )}

            {/* Исполнитель */}
            {task.assigned_organizer_id && (
              <div>
                <label className="block text-[12px] font-forum text-[#00000080] mb-2">
                  Исполнитель
                </label>
                <div className="flex items-center gap-3">
                  {assignedOrganizer?.avatar ? (
                    <img
                      src={assignedOrganizer.avatar}
                      alt={assignedOrganizer.name || 'Исполнитель'}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      style={{ objectPosition: 'center' }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-[14px] text-white font-medium">
                        {assignedOrganizer?.name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <span className="text-[14px] max-[1599px]:text-[13px] font-forum text-black">
                    {assignedOrganizer?.name || 'Неизвестно'}
                  </span>
                </div>
              </div>
            )}

            {/* Даты */}
            <div className="grid grid-cols-2 gap-4">
              {task.created_at && (
                <div>
                  <label className="block text-[12px] font-forum text-[#00000080] mb-2">
                    Создано
                  </label>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum text-black">
                    {formatDateTime(task.created_at)}
                  </p>
                </div>
              )}
              {task.updated_at && (
                <div>
                  <label className="block text-[12px] font-forum text-[#00000080] mb-2">
                    Обновлено
                  </label>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum text-black">
                    {formatDateTime(task.updated_at)}
                  </p>
                </div>
              )}
            </div>

            {/* Кнопки */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#00000033]">
              {onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit();
                  }}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[14px] max-[1599px]:text-[13px] font-forum"
                >
                  Редактировать
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 border border-[#00000033] rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-[14px] max-[1599px]:text-[13px] font-forum"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskViewModal;

