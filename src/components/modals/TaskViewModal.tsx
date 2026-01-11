import { useState, useRef, useEffect, useMemo } from 'react';
import type { Task, User } from '../../types';
import { getPriorityText } from '../../utils/priorityUtils';
import { formatDateTime } from '../../utils/dateUtils';

interface TaskViewModalProps {
  task: Task | null;
  assignedOrganizer?: User | null;
  organizers?: User[];
  onClose: () => void;
  onEdit?: () => void;
  onSave?: (taskId: string, updates: { title_ru?: string; priority?: 'low' | 'medium' | 'high'; assigned_organizer_id?: string | null }) => void;
}

const TaskViewModal = ({ task, assignedOrganizer, organizers = [], onClose, onEdit, onSave }: TaskViewModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [editAssignedOrganizerId, setEditAssignedOrganizerId] = useState<string | null | undefined>(undefined);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showOrganizerDropdown, setShowOrganizerDropdown] = useState(false);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const organizerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task) {
      setEditTitle(task.title_ru || task.title || task.title_en || task.title_ua || '');
      setEditPriority(task.priority);
      setEditAssignedOrganizerId(task.assigned_organizer_id || null);
    }
  }, [task]);

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

  const handleSave = () => {
    if (!task || !onSave) return;
    
    const updates: { title_ru?: string; priority?: 'low' | 'medium' | 'high'; assigned_organizer_id?: string | null } = {};
    
    if (editTitle.trim() && editTitle.trim() !== (task.title_ru || task.title || task.title_en || task.title_ua || '')) {
      updates.title_ru = editTitle.trim();
    }
    
    if (editPriority !== task.priority) {
      updates.priority = editPriority;
    }
    
    if (editAssignedOrganizerId !== (task.assigned_organizer_id || null)) {
      updates.assigned_organizer_id = editAssignedOrganizerId;
    }
    
    if (Object.keys(updates).length > 0) {
      onSave(task.id, updates);
    }
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (task) {
      setEditTitle(task.title_ru || task.title || task.title_en || task.title_ua || '');
      setEditPriority(task.priority);
      setEditAssignedOrganizerId(task.assigned_organizer_id || null);
    }
    setIsEditing(false);
  };

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
              {isEditing ? (
                <textarea
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white min-h-[100px] resize-y text-[16px] max-[1599px]:text-[14px]"
                  placeholder="Введите текст задания"
                />
              ) : (
                <p className="text-[16px] max-[1599px]:text-[14px] font-forum text-black">
                  {task.title_ru || task.title || task.title_en || task.title_ua || 'Нет описания'}
                </p>
              )}
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
            {(task.priority || isEditing) && (
              <div>
                <label className="block text-[12px] font-forum text-[#00000080] mb-2">
                  Приоритет
                </label>
                {isEditing ? (
                  <div className="relative" ref={priorityDropdownRef}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPriorityDropdown(!showPriorityDropdown);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 border border-[#00000033] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <span 
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          editPriority === 'high' ? 'bg-red-500' :
                          editPriority === 'medium' ? 'bg-amber-500' :
                          editPriority === 'low' ? 'bg-green-500' :
                          'bg-gray-300'
                        }`}
                      />
                      <span className="text-[14px] max-[1599px]:text-[13px] font-forum">
                        {editPriority ? getPriorityText(editPriority) : 'Не выбран'}
                      </span>
                    </button>
                    {showPriorityDropdown && (
                      <div className="absolute left-0 top-full mt-1 bg-white border border-[#00000033] rounded-lg shadow-lg z-50 min-w-[140px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditPriority('high');
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
                            setEditPriority('medium');
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
                            setEditPriority('low');
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
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${priorityColor}`} />
                    <span className="text-[14px] max-[1599px]:text-[13px] font-forum text-black">
                      {getPriorityText(task.priority)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Исполнитель */}
            {(task.assigned_organizer_id || isEditing) && (
              <div>
                <label className="block text-[12px] font-forum text-[#00000080] mb-2">
                  Исполнитель
                </label>
                {isEditing ? (
                  <div className="relative" ref={organizerDropdownRef}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOrganizerDropdown(!showOrganizerDropdown);
                      }}
                      className="flex items-center gap-2 px-3 py-2 border border-[#00000033] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      {editAssignedOrganizerId ? (
                        <>
                          {organizers.find(o => o.id === editAssignedOrganizerId)?.avatar ? (
                            <img
                              src={organizers.find(o => o.id === editAssignedOrganizerId)?.avatar}
                              alt={organizers.find(o => o.id === editAssignedOrganizerId)?.name || ''}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-[12px] text-white font-medium">
                                {organizers.find(o => o.id === editAssignedOrganizerId)?.name?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <span className="text-[14px] max-[1599px]:text-[13px] font-forum">
                            {organizers.find(o => o.id === editAssignedOrganizerId)?.name || 'Неизвестно'}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full border-2 border-dashed border-[#00000033] flex items-center justify-center flex-shrink-0">
                            <span className="text-[12px] font-forum text-[#00000060]">+</span>
                          </div>
                          <span className="text-[14px] max-[1599px]:text-[13px] font-forum text-[#00000060]">
                            Не назначен
                          </span>
                        </>
                      )}
                    </button>
                    {showOrganizerDropdown && (
                      <div className="absolute left-0 top-full mt-1 bg-white border border-[#00000033] rounded-lg shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditAssignedOrganizerId(null);
                            setShowOrganizerDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full border-2 border-dashed border-[#00000033] flex items-center justify-center flex-shrink-0">
                            <span className="text-[12px] font-forum text-[#00000060]">—</span>
                          </div>
                          <span className="text-[13px] max-[1599px]:text-[12px] font-forum">Не назначен</span>
                        </button>
                        {organizers.map((organizer) => (
                          <button
                            key={organizer.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditAssignedOrganizerId(organizer.id);
                              setShowOrganizerDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                          >
                            {organizer.avatar ? (
                              <img
                                src={organizer.avatar}
                                alt={organizer.name || ''}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                <span className="text-[12px] text-white font-medium">
                                  {organizer.name?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                            )}
                            <span className="text-[13px] max-[1599px]:text-[12px] font-forum">
                              {organizer.name || 'Неизвестно'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : task.assigned_organizer_id ? (
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
                ) : null}
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
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[14px] max-[1599px]:text-[13px] font-forum"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-[#00000033] rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-[14px] max-[1599px]:text-[13px] font-forum"
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <>
                  {onEdit && (
                    <button
                      onClick={() => setIsEditing(true)}
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskViewModal;

