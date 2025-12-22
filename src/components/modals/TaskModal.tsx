import { useState } from 'react';
import type { Task } from '../../types';
import { getTranslation } from '../../utils/translations';
import { getInitialLanguage } from '../../utils/languageUtils';

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
  onSave: (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'wedding_id'>) => void;
}

const TaskModal = ({ task, onClose, onSave }: TaskModalProps) => {
  const currentLanguage = getInitialLanguage();
  const t = getTranslation(currentLanguage);

  const [formData, setFormData] = useState({
    title: task?.title || '',
    title_en: task?.title_en || '',
    title_ru: task?.title_ru || '',
    title_ua: task?.title_ua || '',
    link: task?.link || '',
    link_text: task?.link_text || '',
    link_text_en: task?.link_text_en || '',
    link_text_ru: task?.link_text_ru || '',
    link_text_ua: task?.link_text_ua || '',
    due_date: task?.due_date || '',
    status: (task?.status || 'pending') as 'pending' | 'in_progress' | 'completed',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация: хотя бы одно название задачи обязательно
    if (!formData.title_en?.trim() && !formData.title_ru?.trim() && !formData.title_ua?.trim()) {
      return;
    }
    
    // Используем первое заполненное поле как основное title для обратной совместимости
    const mainTitle = formData.title_en?.trim() || formData.title_ru?.trim() || formData.title_ua?.trim() || '';
    
    // Используем первое заполненное поле как основное link_text для обратной совместимости
    const mainLinkText = formData.link_text_en?.trim() || formData.link_text_ru?.trim() || formData.link_text_ua?.trim() || formData.link_text?.trim() || '';
    
    // Подготавливаем данные, убирая пустые опциональные поля
    // wedding_id не включаем - он будет добавлен в родительском компоненте (для заданий свадеб) или будет null (для заданий организатора)
    // organizer_id и task_group_id также не включаем - они будут установлены в родительском компоненте
    const taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'wedding_id'> = {
      title: mainTitle,
      status: formData.status,
      organizer_id: null, // Для заданий свадьбы organizer_id будет null
      task_group_id: null, // Для заданий свадьбы task_group_id будет null
      ...(formData.title_en?.trim() && { title_en: formData.title_en.trim() }),
      ...(formData.title_ru?.trim() && { title_ru: formData.title_ru.trim() }),
      ...(formData.title_ua?.trim() && { title_ua: formData.title_ua.trim() }),
      ...(formData.due_date && formData.due_date.trim() && { due_date: formData.due_date }),
      ...(formData.link && formData.link.trim() && { link: formData.link.trim() }),
      ...(mainLinkText && { link_text: mainLinkText }),
      ...(formData.link_text_en?.trim() && { link_text_en: formData.link_text_en.trim() }),
      ...(formData.link_text_ru?.trim() && { link_text_ru: formData.link_text_ru.trim() }),
      ...(formData.link_text_ua?.trim() && { link_text_ua: formData.link_text_ua.trim() }),
    };
    
    onSave(taskData);
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ animation: 'modal-backdrop-fade-in 0.3s ease-out forwards' }}>
      <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-lg w-full" style={{ animation: 'modal-content-scale-in 0.3s ease-out forwards' }}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              {task ? t.organizer.editTask : t.organizer.addTask}
            </h2>
            <button onClick={onClose} className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  {t.organizer.documentName} (EN) *
                </label>
                <input
                  type="text"
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value, title: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  {t.organizer.documentName} (RU) *
                </label>
                <input
                  type="text"
                  value={formData.title_ru}
                  onChange={(e) => setFormData({ ...formData, title_ru: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  {t.organizer.documentName} (UA) *
                </label>
                <input
                  type="text"
                  value={formData.title_ua}
                  onChange={(e) => setFormData({ ...formData, title_ua: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.taskStatus.completed}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'in_progress' | 'completed' })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum cursor-pointer bg-white"
              >
                <option value="pending">{t.organizer.taskStatus.pending}</option>
                <option value="in_progress">{t.organizer.taskStatus.inProgress}</option>
                <option value="completed">{t.organizer.taskStatus.completed}</option>
              </select>
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.dueDate}
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.documentLink} ({t.common.more})
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.linkText} ({t.common.more})
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[14px] max-[1599px]:text-[12px] font-forum font-normal text-black mb-1">
                    {t.organizer.linkText} (EN)
                  </label>
                  <input
                    type="text"
                    value={formData.link_text_en}
                    onChange={(e) => setFormData({ ...formData, link_text_en: e.target.value, link_text: e.target.value })}
                    placeholder={t.organizer.linkText}
                    className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[14px] max-[1599px]:text-[12px] font-forum font-normal text-black mb-1">
                    {t.organizer.linkText} (RU)
                  </label>
                  <input
                    type="text"
                    value={formData.link_text_ru}
                    onChange={(e) => setFormData({ ...formData, link_text_ru: e.target.value })}
                    placeholder={t.organizer.linkText}
                    className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[14px] max-[1599px]:text-[12px] font-forum font-normal text-black mb-1">
                    {t.organizer.linkText} (UA)
                  </label>
                  <input
                    type="text"
                    value={formData.link_text_ua}
                    onChange={(e) => setFormData({ ...formData, link_text_ua: e.target.value })}
                    placeholder={t.organizer.linkText}
                    className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 md:px-6 py-2 md:py-3 border border-[#00000033] rounded-lg text-black hover:bg-white transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum bg-[#FBF9F5]"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
              >
                {task ? t.common.save : t.common.create}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;

