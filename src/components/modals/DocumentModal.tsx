import { useState } from 'react';
import type { Document } from '../../types';
import { getTranslation } from '../../utils/translations';
import { getInitialLanguage } from '../../utils/languageUtils';

interface DocumentModalProps {
  document: Document | null;
  weddingId: string;
  onClose: () => void;
  onSave: (
    data: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'>
  ) => void;
}

const DocumentModal = ({ document, weddingId, onClose, onSave }: DocumentModalProps) => {
  const currentLanguage = getInitialLanguage();
  const t = getTranslation(currentLanguage);

  const [formData, setFormData] = useState({
    name: document?.name || '',
    name_en: document?.name_en || '',
    name_ru: document?.name_ru || '',
    name_ua: document?.name_ua || '',
    link: document?.link || '',
    pinned: document?.pinned || false,
  });
  const [error, setError] = useState<string | null>(null);

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const link = e.target.value;
    setFormData({ ...formData, link });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация: хотя бы одно название документа обязательно
    if (!formData.name_en?.trim() && !formData.name_ru?.trim() && !formData.name_ua?.trim() && !formData.name?.trim()) {
      const currentLang = getInitialLanguage();
      const translations = getTranslation(currentLang);
      setError(translations.organizer.saveError);
      return;
    }

    // Используем первое заполненное поле как основное name для обратной совместимости
    const mainName = formData.name_en?.trim() || formData.name_ru?.trim() || formData.name_ua?.trim() || '';

    const docData: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'> = {
      wedding_id: weddingId,
      name: mainName,
      pinned: formData.pinned,
      ...(formData.name_en?.trim() && { name_en: formData.name_en.trim() }),
      ...(formData.name_ru?.trim() && { name_ru: formData.name_ru.trim() }),
      ...(formData.name_ua?.trim() && { name_ua: formData.name_ua.trim() }),
      ...(formData.link && formData.link.trim() && { link: formData.link.trim() }),
    };

    // Создаем/обновляем документ (только со ссылкой или без ссылки)
    try {
      await onSave(docData);
      onClose();
    } catch (err) {
      const currentLang = getInitialLanguage();
      const translations = getTranslation(currentLang);
      setError(translations.organizer.saveError);
      console.error('Error saving document:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ animation: 'modal-backdrop-fade-in 0.3s ease-out forwards' }}>
      <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-lg w-full" style={{ animation: 'modal-content-scale-in 0.3s ease-out forwards' }}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              {document ? t.organizer.editDocument : t.organizer.addDocument}
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
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  {t.organizer.documentName} (RU) *
                </label>
                <input
                  type="text"
                  value={formData.name_ru}
                  onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  {t.organizer.documentName} (UA) *
                </label>
                <input
                  type="text"
                  value={formData.name_ua}
                  onChange={(e) => setFormData({ ...formData, name_ua: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.documentLink} <span className="font-normal text-[#00000080]">({t.common.more})</span>
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={handleLinkChange}
                placeholder="https://docs.google.com/..."
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white placeholder:text-[#00000060]"
              />
              <p className="text-[12px] font-forum font-light text-[#00000080] mt-1">
                Укажите ссылку на документ в Google Docs, Google Sheets, Google Drive или другой сервис
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-[14px] font-forum text-red-600">{error}</p>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="pinned"
                checked={formData.pinned}
                onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                className="h-4 w-4 text-black focus:ring-black border-[#00000033] rounded cursor-pointer"
              />
              <label htmlFor="pinned" className="ml-2 block text-[16px] max-[1599px]:text-[14px] font-forum text-black cursor-pointer">
                {t.organizer.pinned}
              </label>
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
                className="px-5 py-2 bg-black text-white rounded-md hover:bg-[#1a1a1a] active:scale-[0.98] transition-all duration-200 cursor-pointer text-[15px] max-[1599px]:text-[13px] font-forum font-medium"
              >
                {document ? t.common.save : t.common.create}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DocumentModal;

