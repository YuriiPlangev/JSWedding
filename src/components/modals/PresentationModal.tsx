import { useState } from 'react';
import { getTranslation } from '../../utils/translations';
import { getInitialLanguage } from '../../utils/languageUtils';

interface PresentationModalProps {
  onClose: () => void;
  onUpload: (data: {
    title: string;
    pdfFile: File;
    sections: Array<{ title: string; page_number: number }>;
  }) => Promise<void>;
  uploading: boolean;
}

const PresentationModal = ({ onClose, onUpload, uploading }: PresentationModalProps) => {
  const currentLanguage = getInitialLanguage();

  const [title, setTitle] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sections, setSections] = useState<Array<{ title: string; page_number: number }>>([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionPage, setNewSectionPage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Пожалуйста, выберите PDF файл');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setError('Размер файла не должен превышать 100MB');
        return;
      }
      setPdfFile(file);
      setError(null);
    }
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) {
      setError('Укажите название раздела');
      return;
    }
    const pageNum = parseInt(newSectionPage);
    if (isNaN(pageNum) || pageNum < 1) {
      setError('Укажите корректный номер страницы');
      return;
    }
    setSections([...sections, { title: newSectionTitle.trim(), page_number: pageNum }]);
    setNewSectionTitle('');
    setNewSectionPage('');
    setError(null);
  };

  const handleRemoveSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Укажите название презентации');
      return;
    }
    if (!pdfFile) {
      setError('Выберите PDF файл');
      return;
    }

    try {
      await onUpload({ title: title.trim(), pdfFile, sections });
      setTitle('');
      setPdfFile(null);
      setSections([]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ animation: 'modal-backdrop-fade-in 0.3s ease-out forwards' }}>
      <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ animation: 'modal-content-scale-in 0.3s ease-out forwards' }}>
        <div className="sticky top-0 bg-[#FBF9F5] border-b border-[#00000033] p-6 flex justify-between items-center">
          <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
            Загрузить PDF презентацию
          </h2>
          <button 
            onClick={onClose} 
            disabled={uploading}
            className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Название */}
          <div>
            <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-2">
              Название презентации *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Презентация свадьбы"
              disabled={uploading}
              className="w-full px-4 py-3 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white disabled:opacity-50 text-[14px]"
            />
          </div>

          {/* PDF файл */}
          <div>
            <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-2">
              PDF файл *
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="w-full px-4 py-3 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white disabled:opacity-50 text-[14px]"
            />
            {pdfFile && (
              <div className="mt-2 p-3 bg-[#00000005] rounded border border-[#00000033]">
                <p className="text-[13px] font-forum text-black">
                  📄 {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)}MB)
                </p>
              </div>
            )}
          </div>

          {/* Разделы */}
          <div>
            <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-2">
              Разделы (опционально)
            </label>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="Название раздела"
                disabled={uploading}
                className="flex-1 px-4 py-2 border border-[#00000033] rounded-lg font-forum bg-white disabled:opacity-50 text-[14px]"
              />
              <input
                type="number"
                value={newSectionPage}
                onChange={(e) => setNewSectionPage(e.target.value)}
                placeholder="Стр."
                min="1"
                disabled={uploading}
                className="w-20 px-3 py-2 border border-[#00000033] rounded-lg font-forum bg-white disabled:opacity-50 text-[14px]"
              />
              <button
                type="button"
                onClick={handleAddSection}
                disabled={uploading}
                className="px-6 py-2 bg-black text-white rounded-lg font-forum font-bold hover:bg-[#00000090] disabled:opacity-50 text-[14px]"
              >
                +
              </button>
            </div>
            {sections.length > 0 && (
              <div className="space-y-2">
                {sections.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#00000005] rounded border border-[#00000033]">
                    <div>
                      <p className="text-[14px] font-forum font-bold text-black">{s.title}</p>
                      <p className="text-[12px] font-forum text-[#00000080]">Страница {s.page_number}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(i)}
                      disabled={uploading}
                      className="text-[#00000080] hover:text-red-600 text-lg disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              disabled={uploading}
              className="px-6 py-2 border border-[#00000033] rounded-lg font-forum font-bold text-black hover:bg-[#00000005] disabled:opacity-50 text-[14px]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={uploading || !title.trim() || !pdfFile}
              className="px-6 py-2 bg-black text-white rounded-lg font-forum font-bold hover:bg-[#00000090] disabled:opacity-50 text-[14px]"
            >
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PresentationModal;