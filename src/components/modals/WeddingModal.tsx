import { useState } from 'react';
import type { Wedding, User } from '../../types';
import { getTranslation } from '../../utils/translations';
import { getInitialLanguage } from '../../utils/languageUtils';

interface WeddingModalProps {
  wedding: Wedding | null;
  clients: User[];
  onClose: () => void;
  onSave: (data: Omit<Wedding, 'id' | 'created_at' | 'updated_at'>) => void;
}

const WeddingModal = ({ wedding, clients, onClose, onSave }: WeddingModalProps) => {
  const currentLanguage = getInitialLanguage();
  const t = getTranslation(currentLanguage);

  const [formData, setFormData] = useState({
    client_id: wedding?.client_id || '',
    couple_name_1_en: wedding?.couple_name_1_en || '',
    couple_name_1_ru: wedding?.couple_name_1_ru || '',
    couple_name_2_en: wedding?.couple_name_2_en || '',
    couple_name_2_ru: wedding?.couple_name_2_ru || '',
    wedding_date: wedding?.wedding_date || '',
    country: wedding?.country || '',
    country_en: wedding?.country_en || '',
    country_ru: wedding?.country_ru || '',
    country_ua: wedding?.country_ua || '',
    venue: wedding?.venue || '',
    guest_count: wedding?.guest_count || 0,
    chat_link: wedding?.chat_link || '',
    welcome_message_en: wedding?.welcome_message_en || '',
    splash_welcome_text_en: wedding?.splash_welcome_text_en || '',
    full_welcome_text_en: wedding?.full_welcome_text_en || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Omit<Wedding, 'id' | 'created_at' | 'updated_at'>);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              {wedding ? t.organizer.editProject : t.organizer.addProject}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  {t.organizer.partner1NameEn} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name_1_en}
                  onChange={(e) => setFormData({ ...formData, couple_name_1_en: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  {t.organizer.partner1NameRu} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name_1_ru}
                  onChange={(e) => setFormData({ ...formData, couple_name_1_ru: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  {t.organizer.partner2NameEn} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name_2_en}
                  onChange={(e) => setFormData({ ...formData, couple_name_2_en: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  {t.organizer.partner2NameRu} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name_2_ru}
                  onChange={(e) => setFormData({ ...formData, couple_name_2_ru: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
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
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                {t.organizer.fullWelcomeTextEn}
              </label>
              <input
                type="text"
                value={formData.full_welcome_text_en}
                onChange={(e) => setFormData({ ...formData, full_welcome_text_en: e.target.value })}
                placeholder="Konstantin & Diana, Welcome to your wedding organization space!"
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
              <p className="text-[12px] max-[1599px]:text-[11px] font-forum font-light text-[#00000060] mt-1">
                {t.organizer.fullWelcomeTextEnHint}
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
                placeholder="Welcome to your wedding organization space!"
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
              <p className="text-[12px] max-[1599px]:text-[11px] font-forum font-light text-[#00000060] mt-1">
                {t.organizer.splashWelcomeTextEnHint}
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
                {t.common.save}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WeddingModal;

