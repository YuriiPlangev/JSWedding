import { useState, useEffect } from 'react';
import type { Wedding, User } from '../../types';
import { getTranslation } from '../../utils/translations';
import { getInitialLanguage } from '../../utils/languageUtils';

interface WeddingModalProps {
  wedding: Wedding | null;
  clients: User[];
  onClose: () => void;
  onSave: (data: Omit<Wedding, 'id' | 'created_at' | 'updated_at'>) => void;
  onDelete?: (weddingId: string) => void;
}

const WeddingModal = ({ wedding, clients, onClose, onSave, onDelete }: WeddingModalProps) => {
  const currentLanguage = getInitialLanguage();
  const t = getTranslation(currentLanguage);

  // Вычисляем имена пары для отображения в одном поле
  const getCoupleNamesEn = () => {
    // Приоритет английским именам, если они есть и не пустые
    const name1 = (wedding?.couple_name_1_en?.trim() || wedding?.couple_name_1_ru?.trim() || '');
    const name2 = (wedding?.couple_name_2_en?.trim() || wedding?.couple_name_2_ru?.trim() || '');
    
    if (name1 && name2) {
      return `${name1} & ${name2}`;
    }
    if (name1) {
      return name1;
    }
    return '';
  };

  // Вычисляем значение по умолчанию для Full Welcome Text
  const getDefaultFullWelcomeText = () => {
    if (wedding?.full_welcome_text_en) {
      return wedding.full_welcome_text_en;
    }
    if (wedding?.couple_name_1_en && wedding?.couple_name_2_en) {
      return `${wedding.couple_name_1_en} & ${wedding.couple_name_2_en}, Welcome to your wedding organization space!`;
    }
    return '';
  };

  const [formData, setFormData] = useState({
    project_name: wedding?.project_name || '',
    client_id: wedding?.client_id || '',
    coupleNamesEn: getCoupleNamesEn(),
    wedding_date: wedding?.wedding_date || '',
    country: wedding?.country || '',
    country_en: wedding?.country_en || '',
    country_ru: wedding?.country_ru || '',
    country_ua: wedding?.country_ua || '',
    venue: wedding?.venue || '',
    guest_count: wedding?.guest_count || 0,
    chat_link: wedding?.chat_link || '',
    welcome_message_en: wedding?.welcome_message_en || '',
    splash_welcome_text_en: wedding?.splash_welcome_text_en || 'Welcome to your wedding organization space!',
    full_welcome_text_en: getDefaultFullWelcomeText(),
    full_welcome_text_was_set: !!wedding?.full_welcome_text_en, // Отслеживаем, было ли значение установлено пользователем
  });

  // Синхронизируем форму с данными свадьбы при изменении пропса wedding
  useEffect(() => {
    if (wedding) {
      // Приоритет английским именам, если они есть и не пустые, иначе используем русские
      const name1 = (wedding.couple_name_1_en?.trim() || wedding.couple_name_1_ru?.trim() || '');
      const name2 = (wedding.couple_name_2_en?.trim() || wedding.couple_name_2_ru?.trim() || '');
      const coupleNames = (name1 && name2) ? `${name1} & ${name2}` : (name1 ? name1 : '');
      
      const defaultFullWelcomeText = wedding.full_welcome_text_en?.trim()
        ? wedding.full_welcome_text_en
        : (name1 && name2
          ? `${name1} & ${name2}, Welcome to your wedding organization space!`
          : '');

      setFormData({
        project_name: wedding.project_name || '',
        client_id: wedding.client_id || '',
        coupleNamesEn: coupleNames,
        wedding_date: wedding.wedding_date || '',
        country: wedding.country || '',
        country_en: wedding.country_en || '',
        country_ru: wedding.country_ru || '',
        country_ua: wedding.country_ua || '',
        venue: wedding.venue || '',
        guest_count: wedding.guest_count || 0,
        chat_link: wedding.chat_link || '',
        welcome_message_en: wedding.welcome_message_en || '',
        splash_welcome_text_en: wedding.splash_welcome_text_en || 'Welcome to your wedding organization space!',
        full_welcome_text_en: defaultFullWelcomeText,
        full_welcome_text_was_set: !!wedding.full_welcome_text_en?.trim(),
      });
    } else {
      // Если wedding null, сбрасываем форму
      setFormData({
        project_name: '',
        client_id: '',
        coupleNamesEn: '',
        wedding_date: '',
        country: '',
        country_en: '',
        country_ru: '',
        country_ua: '',
        venue: '',
        guest_count: 0,
        chat_link: '',
        welcome_message_en: '',
        splash_welcome_text_en: 'Welcome to your wedding organization space!',
        full_welcome_text_en: '',
        full_welcome_text_was_set: false,
      });
    }
  }, [wedding]);

  // Обновляем Full Welcome Text при изменении имен пары, только если пользователь еще не установил его вручную
  const handleCoupleNamesChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, coupleNamesEn: value };
      // Если полный текст не был установлен пользователем, обновляем его автоматически
      if (!prev.full_welcome_text_was_set && value.trim()) {
        const names = value.split('&').map(name => name.trim()).filter(Boolean);
        if (names.length === 2) {
          newData.full_welcome_text_en = `${names[0]} & ${names[1]}, Welcome to your wedding organization space!`;
        }
      }
      return newData;
    });
  };

  // Обработчик изменения Full Welcome Text - помечаем, что пользователь установил его вручную
  const handleFullWelcomeTextChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      full_welcome_text_en: value,
      full_welcome_text_was_set: true,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Парсим имена пары из одной строки
    const coupleNames = formData.coupleNamesEn.trim();
    const names = coupleNames.split('&').map(name => name.trim()).filter(Boolean);
    const couple_name_1_en = names[0] || '';
    const couple_name_2_en = names[1] || '';

    // Создаем объект без служебных полей
    const weddingData: Omit<Wedding, 'id' | 'created_at' | 'updated_at'> = {
      project_name: formData.project_name.trim() || undefined,
      client_id: formData.client_id,
      organizer_id: wedding?.organizer_id || '', // Будет заменен в handleSaveWedding при создании
      couple_name_1_en: couple_name_1_en || '',
      couple_name_2_en: couple_name_2_en || '',
      couple_name_1_ru: wedding?.couple_name_1_ru || '',
      couple_name_2_ru: wedding?.couple_name_2_ru || '',
      wedding_date: formData.wedding_date,
      country: formData.country,
      country_en: formData.country_en,
      country_ru: formData.country_ru,
      country_ua: formData.country_ua,
      venue: formData.venue,
      guest_count: formData.guest_count,
      chat_link: formData.chat_link.trim() || undefined,
      welcome_message_en: formData.welcome_message_en.trim() || undefined,
      splash_welcome_text_en: formData.splash_welcome_text_en.trim() || undefined,
      full_welcome_text_en: formData.full_welcome_text_en.trim() || undefined,
    };
    
    onSave(weddingData);
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4" style={{ animation: 'modal-backdrop-fade-in 0.3s ease-out forwards' }}>
      <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ animation: 'modal-content-scale-in 0.3s ease-out forwards' }}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              {wedding ? 'Редактировать ивент' : 'Добавить ивент'}
            </h2>
            <button onClick={onClose} className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.client} *
              </label>
              {clients.length > 0 ? (
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum cursor-pointer bg-white"
                  disabled={!!wedding}
                >
                  <option value="">{t.organizer.selectClient}</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 border border-[#00000033] rounded-lg bg-gray-50">
                  <p className="text-[14px] font-forum text-[#00000080]">
                    Список клиентов пуст. Создайте клиента перед добавлением ивента.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Название проекта
              </label>
              <input
                type="text"
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                placeholder="Введите название проекта (только для организатора)"
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white placeholder:text-[#00000060]"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.weddingDate} *
              </label>
              <input
                type="date"
                required
                value={formData.wedding_date}
                onChange={(e) => setFormData({ ...formData, wedding_date: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  {t.organizer.countryEn} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.country_en}
                  onChange={(e) => setFormData({ ...formData, country_en: e.target.value, country: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  {t.organizer.countryRu} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.country_ru}
                  onChange={(e) => setFormData({ ...formData, country_ru: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  {t.organizer.countryUa} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.country_ua}
                  onChange={(e) => setFormData({ ...formData, country_ua: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.place} *
              </label>
              <input
                type="text"
                required
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.guestCount} *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.guest_count}
                onChange={(e) => setFormData({ ...formData, guest_count: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.chatLink || 'Ссылка на чат с организатором'}
              </label>
              <input
                type="url"
                value={formData.chat_link}
                onChange={(e) => setFormData({ ...formData, chat_link: e.target.value })}
                placeholder="https://t.me/..."
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white placeholder:text-[#00000060]"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Имена пары (EN) *
              </label>
              <input
                type="text"
                required
                value={formData.coupleNamesEn}
                onChange={(e) => handleCoupleNamesChange(e.target.value)}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white placeholder:text-[#00000060]"
                placeholder="Name 1 & Name 2"
              />
              <p className="text-[12px] max-[1599px]:text-[11px] font-forum font-light text-[#00000060] mt-1">
                Введите имена пары на английском в одну строку через & (например: Konstantin & Diana)
              </p>
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.splashWelcomeTextEn}
              </label>
              <input
                type="text"
                value={formData.splash_welcome_text_en}
                onChange={(e) => setFormData({ ...formData, splash_welcome_text_en: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
              <p className="text-[12px] max-[1599px]:text-[11px] font-forum font-light text-[#00000060] mt-1">
                {t.organizer.splashWelcomeTextEnHint}
              </p>
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.fullWelcomeTextEn}
              </label>
              <input
                type="text"
                value={formData.full_welcome_text_en}
                onChange={(e) => handleFullWelcomeTextChange(e.target.value)}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white placeholder:text-[#00000060]"
                placeholder="Name 1 & Name 2, Welcome to your wedding organization space!"
              />
              <p className="text-[12px] max-[1599px]:text-[11px] font-forum font-light text-[#00000060] mt-1">
                {t.organizer.fullWelcomeTextEnHint}
              </p>
            </div>

            <div className="flex justify-between items-center gap-4 mt-6">
              {wedding && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Вы уверены, что хотите удалить этот проект?')) {
                      onDelete(wedding.id);
                      onClose();
                    }
                  }}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
                >
                  {t.common.delete}
                </button>
              )}
              <div className="flex justify-end gap-4 ml-auto">
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
                  {t.common.save}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WeddingModal;

