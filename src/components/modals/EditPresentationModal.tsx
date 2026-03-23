import { useEffect, useMemo, useState } from 'react';

interface SectionFormItem {
  id: string;
  title: string;
  page_number: number;
}

interface EditPresentationModalProps {
  isOpen: boolean;
  isSaving?: boolean;
  initialTitle: string;
  initialSections: Array<{ id?: string | number; title: string; page_number: number }>;
  onClose: () => void;
  onSave: (data: { title: string; sections: Array<{ title: string; page_number: number }> }) => Promise<void>;
}

const EditPresentationModal = ({
  isOpen,
  isSaving = false,
  initialTitle,
  initialSections,
  onClose,
  onSave,
}: EditPresentationModalProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [sections, setSections] = useState<SectionFormItem[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionPage, setNewSectionPage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const normalizedInitialSections = useMemo(
    () =>
      (initialSections || []).map((section, index) => ({
        id: String(section.id ?? index),
        title: section.title || '',
        page_number: section.page_number || index + 1,
      })),
    [initialSections]
  );

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialTitle || '');
    setSections(normalizedInitialSections);
    setNewSectionTitle('');
    setNewSectionPage('');
    setError(null);
  }, [isOpen, initialTitle, normalizedInitialSections]);

  if (!isOpen) return null;

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) {
      setError('Укажите название раздела');
      return;
    }
    const pageNum = parseInt(newSectionPage, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      setError('Укажите корректный номер страницы');
      return;
    }
    setSections((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        title: newSectionTitle.trim(),
        page_number: pageNum,
      },
    ]);
    setNewSectionTitle('');
    setNewSectionPage('');
    setError(null);
  };

  const handleUpdateSection = (id: string, patch: Partial<SectionFormItem>) => {
    setSections((prev) => prev.map((section) => (section.id === id ? { ...section, ...patch } : section)));
  };

  const handleRemoveSection = (id: string) => {
    setSections((prev) => prev.filter((section) => section.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Укажите название презентации');
      return;
    }

    const cleanedSections = sections
      .map((section) => ({
        title: section.title.trim(),
        page_number: Number(section.page_number),
      }))
      .filter((section) => section.title && Number.isFinite(section.page_number) && section.page_number > 0);

    try {
      await onSave({
        title: title.trim(),
        sections: cleanedSections,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при сохранении презентации';
      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#FBF9F5] border-b border-[#00000033] p-6 flex justify-between items-center">
          <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
            Редактировать презентацию
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-2">
              Название презентации *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              className="w-full px-4 py-3 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white disabled:opacity-50 text-[14px]"
            />
          </div>

          <div>
            <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-2">
              Разделы (секции)
            </label>

            <div className="space-y-2 mb-4">
              {sections.map((section) => (
                <div key={section.id} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                    disabled={isSaving}
                    className="px-3 py-2 border border-[#00000033] rounded-lg font-forum bg-white disabled:opacity-50 text-[14px]"
                  />
                  <input
                    type="number"
                    min="1"
                    value={section.page_number}
                    onChange={(e) => handleUpdateSection(section.id, { page_number: parseInt(e.target.value || '0', 10) })}
                    disabled={isSaving}
                    className="px-3 py-2 border border-[#00000033] rounded-lg font-forum bg-white disabled:opacity-50 text-[14px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSection(section.id)}
                    disabled={isSaving}
                    className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-forum text-[14px] disabled:opacity-50"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
              <input
                type="text"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="Название раздела"
                disabled={isSaving}
                className="px-3 py-2 border border-[#00000033] rounded-lg font-forum bg-white disabled:opacity-50 text-[14px]"
              />
              <input
                type="number"
                min="1"
                value={newSectionPage}
                onChange={(e) => setNewSectionPage(e.target.value)}
                placeholder="Стр."
                disabled={isSaving}
                className="px-3 py-2 border border-[#00000033] rounded-lg font-forum bg-white disabled:opacity-50 text-[14px]"
              />
              <button
                type="button"
                onClick={handleAddSection}
                disabled={isSaving}
                className="px-3 py-2 bg-black text-white rounded-lg font-forum hover:bg-[#00000090] transition-colors text-[14px] disabled:opacity-50"
              >
                Добавить
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-[14px] font-forum text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-[#00000033]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2 border border-[#00000033] rounded-lg font-forum font-bold text-black hover:bg-[#00000005] disabled:opacity-50 text-[14px]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="px-6 py-2 bg-black text-white rounded-lg font-forum font-bold hover:bg-[#00000090] disabled:opacity-50 text-[14px]"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPresentationModal;
