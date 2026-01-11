import { useState } from 'react';
import type { Task } from '../../types';

interface OrganizerTaskModalProps {
  task: Task | null;
  onClose: () => void;
  onSave: (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'wedding_id' | 'organizer_id' | 'task_group_id'>) => void;
}

const OrganizerTaskModal = ({ task, onClose, onSave }: OrganizerTaskModalProps) => {
  const [formData, setFormData] = useState({
    title_ru: task?.title_ru || task?.title || '',
    status: (task?.status || 'pending') as 'pending' | 'in_progress' | 'completed',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация: текст задания обязателен
    if (!formData.title_ru?.trim()) {
      return;
    }
    
    const taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'wedding_id' | 'organizer_id' | 'task_group_id'> = {
      title: formData.title_ru.trim(),
      title_ru: formData.title_ru.trim(),
      status: formData.status,
    };
    
    onSave(taskData);
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ animation: 'modal-backdrop-fade-in 0.3s ease-out forwards' }}>
      <div className="bg-[#eae6db] border border-[#00000033] rounded-lg max-w-md w-full" style={{ animation: 'modal-content-scale-in 0.3s ease-out forwards' }}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[28px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              {task ? 'Редактировать задание' : 'Добавить задание'}
            </h2>
            <button 
              onClick={onClose} 
              className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Текст задания *
              </label>
              <textarea
                value={formData.title_ru}
                onChange={(e) => setFormData({ ...formData, title_ru: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white min-h-[100px] resize-y placeholder:text-[#00000060]"
                placeholder="Введите текст задания"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="completed"
                checked={formData.status === 'completed'}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  status: e.target.checked ? 'completed' : 'pending' 
                })}
                className="w-5 h-5 border-2 border-[#00000080] rounded cursor-pointer focus:ring-2 focus:ring-black"
              />
              <label 
                htmlFor="completed" 
                className="text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black cursor-pointer"
              >
                Выполнено
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 md:px-6 py-2 md:py-3 border border-[#00000033] rounded-lg text-black hover:bg-white transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum bg-[#eae6db]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-black text-white rounded-md hover:bg-[#1a1a1a] active:scale-[0.98] transition-all duration-200 cursor-pointer text-[15px] max-[1599px]:text-[13px] font-forum font-medium"
              >
                {task ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrganizerTaskModal;

