import { useState } from 'react';
import { getTranslation } from '../../utils/translations';
import { getInitialLanguage } from '../../utils/languageUtils';

interface PresentationModalProps {
  onClose: () => void;
  onUpload: (files: FileList | null) => void;
  uploading: boolean;
}

const PresentationModal = ({ onClose, onUpload, uploading }: PresentationModalProps) => {
  const currentLanguage = getInitialLanguage();
  const t = getTranslation(currentLanguage);

  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      // Проверяем, что выбрано не более 4 файлов
      if (selectedFiles.length > 4) {
        setError('Можно загрузить максимум 4 изображения');
        return;
      }
      // Проверяем типы файлов
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      for (let i = 0; i < selectedFiles.length; i++) {
        if (!validTypes.includes(selectedFiles[i].type)) {
          setError('Поддерживаются только изображения (JPEG, PNG, WebP)');
          return;
        }
      }
      setFiles(selectedFiles);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError('Пожалуйста, выберите изображения');
      return;
    }
    onUpload(files);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              Загрузить презентацию
            </h2>
            <button 
              onClick={onClose} 
              disabled={uploading}
              className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mb-4">
                Выберите до 4 изображений для презентации. Каждое изображение будет соответствовать одной секции презентации.
              </p>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Изображения (JPEG, PNG, WebP) *
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                disabled={uploading}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {files && files.length > 0 && (
                <div className="mt-2">
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-black mb-2">
                    Выбрано файлов: {files.length}
                  </p>
                  <ul className="list-disc list-inside text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">
                    {Array.from(files).map((file, index) => (
                      <li key={index}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-[14px] font-forum text-red-800">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={uploading || !files || files.length === 0}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Загрузка...' : 'Загрузить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PresentationModal;

