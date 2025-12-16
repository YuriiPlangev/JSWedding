import { useState } from 'react';
import { getTranslation } from '../../utils/translations';
import { getInitialLanguage } from '../../utils/languageUtils';

interface ClientModalProps {
  onClose: () => void;
  onSave: (data: { email: string; password: string;  }) => void;
}

const ClientModal = ({ onClose, onSave }: ClientModalProps) => {
  const currentLanguage = getInitialLanguage();
  const t = getTranslation(currentLanguage);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация
    if (!formData.email.trim()) {
      setError('Email обязателен');
      return;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    onSave({
      email: formData.email.trim(),
      password: formData.password,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              Создать клиента
            </h2>
            <button onClick={onClose} className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light">
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 font-forum text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                placeholder="client@example.com"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Пароль *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                placeholder="Минимум 6 символов"
              />
              <p className="text-[12px] max-[1599px]:text-[11px] font-forum font-light text-[#00000060] mt-1">
                Минимум 6 символов. Клиент сможет изменить пароль после первого входа.
              </p>
            </div>


            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
              >
                Создать
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientModal;

