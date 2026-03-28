import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Wedding, ContractorDocument } from '../types';
import Header from '../components/Header';
import { getInitialLanguage } from '../utils/languageUtils';
import { contractorService } from '../services/contractorService';
import downloadIcon from '../assets/download.svg';

const ContractorDashboard = () => {
  const { logout, user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ru' | 'ua'>(getInitialLanguage());
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [documents, setDocuments] = useState<ContractorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Обработчик изменения языка с сохранением в localStorage
  const handleLanguageChange = (lang: 'en' | 'ru' | 'ua') => {
    setCurrentLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
  };

  // Load wedding data and documents on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Get wedding data
      const { wedding: weddingData, error: weddingError } = await contractorService.getContractorWedding(user.id);
      
      if (weddingError) {
        setError(weddingError);
        setLoading(false);
        return;
      }

      if (!weddingData) {
        setError('No event assigned to this contractor account');
        setLoading(false);
        return;
      }

      setWedding(weddingData);

      // Get contractor documents
      const { documents: docs, error: docsError } = await contractorService.getContractorDocuments(weddingData.id);
      
      if (docsError) {
        setError(docsError);
      } else {
        setDocuments(docs);
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    
    const monthNames = {
      en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
      ua: ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'],
    };
    
    const monthName = monthNames[currentLanguage][monthIndex];
    return `${day} ${monthName} ${year}`;
  };

  
  const getDocumentName = (doc: ContractorDocument): string => {
    if (currentLanguage === 'en' && doc.name_en) return doc.name_en;
    if (currentLanguage === 'ru' && doc.name_ru) return doc.name_ru;
    if (currentLanguage === 'ua' && doc.name_ua) return doc.name_ua;
    return doc.name || doc.name_en || doc.name_ru || doc.name_ua || '';
  };

  const getCoupleName = () => {
    if (!wedding) return '';
    const name1 = currentLanguage === 'ru' && wedding.couple_name_1_ru ? wedding.couple_name_1_ru : wedding.couple_name_1_en || '';
    const name2 = currentLanguage === 'ru' && wedding.couple_name_2_ru ? wedding.couple_name_2_ru : wedding.couple_name_2_en || '';
    return [name1, name2].map((s) => (s || '').trim()).filter(Boolean).join(' & ');
  };

  const getCountryDisplay = () => {
    if (!wedding) return '';
    if (currentLanguage === 'en' && wedding.country_en) return wedding.country_en;
    if (currentLanguage === 'ru' && wedding.country_ru) return wedding.country_ru;
    if (currentLanguage === 'ua' && wedding.country_ua) return wedding.country_ua;
    return wedding.country || wedding.country_en || wedding.country_ru || wedding.country_ua || '';
  };

  const normalizeMapsUrl = (raw: string) => {
    const t = raw.trim();
    if (!t) return '';
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
  };

  const formatPhonePretty = (phoneRaw: string) => {
    const digits = phoneRaw.replace(/\D/g, '');
    if (!digits) return phoneRaw;

    let local = '';
    if (digits.startsWith('380') && digits.length >= 12) {
      local = digits.slice(3);
    } else if (digits.startsWith('0') && digits.length >= 10) {
      local = digits.slice(1);
    } else if (digits.length === 9) {
      local = digits;
    } else {
      return phoneRaw;
    }

    if (local.length !== 9) return phoneRaw;
    return `+380 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`;
  };

  const tryParseJson = <T,>(value?: string | null): T | null => {
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  };

  const getLocalizedName = (names: Record<'en' | 'ru' | 'ua', string> | undefined): string => {
    if (!names) return '';
    const current = names[currentLanguage];
    if (current) return current;
    return names.ru || names.ua || names.en || '';
  };

  const translations = {
    en: {
      date: 'date',
      venue: 'venue',
      guestCount: 'guest count',
      coupleNames: 'couple names',
      dressCode: 'Dress Code',
      documents: 'Documents',
      attachedDocuments: '',
      organizerAndCoordinators: 'Organizer and Coordinators',
      organizer: 'Wedding planner',
      coordinators: 'Coordinators',
      nameLabel: 'Name',
      phoneLabel: 'Phone',
      responsibilityLabel: 'Responsibility',
    },
    ru: {
      date: 'дата события',
      venue: 'локация',
      guestCount: 'количество гостей',
      coupleNames: 'имена пары',
      dressCode: 'Дресс-код',
      documents: 'Документы',
      attachedDocuments: '',
      organizerAndCoordinators: 'Контакты организатора и координаторов',
      organizer: 'Организатор',
      coordinators: 'Координаторы',
      nameLabel: 'Имя',
      phoneLabel: 'Номер телефона',
      responsibilityLabel: 'Зона ответственности',
    },
    ua: {
      date: 'дата події',
      venue: 'локація',
      guestCount: 'кількість гостей',
      coupleNames: 'імена пари',
      dressCode: 'Дрес-код',
      documents: 'Документи',
      attachedDocuments: '',
      organizerAndCoordinators: 'Контакти організатора і координаторів',
      organizer: 'Організатор',
      coordinators: 'Координатори',
      nameLabel: "Ім'я",
      phoneLabel: 'Номер телефону',
      responsibilityLabel: 'Зона відповідальності',
    },
  };

  const t = translations[currentLanguage];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eae6db]">
        <Header
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          onLogout={logout}
        />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-[30px] xl:px-[30px] min-[1500px]:px-[60px] py-2 sm:py-3">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-[18px] font-forum text-[#00000080]">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="min-h-screen bg-[#eae6db]">
        <Header
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          onLogout={logout}
        />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-[30px] xl:px-[30px] min-[1500px]:px-[60px] py-2 sm:py-3">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-[24px] font-forum text-black mb-2">No Event Assigned</p>
              <p className="text-[16px] font-forum text-[#00000080]">
                {error || 'Please contact the organizer to get access to an event.'}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eae6db]">
      <Header
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
        onLogout={logout}
      />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-[30px] xl:px-[30px] min-[1500px]:px-[60px] py-2 sm:py-3">
        <section className="mb-4 sm:mb-6 text-center">
          <h1 className="text-[20px] sm:text-[24px] lg:text-[28px] font-forum font-bold">
            {currentLanguage === 'en' && 'Contractor page'}
            {currentLanguage === 'ru' && 'Страница для подрядчиков'}
            {currentLanguage === 'ua' && 'Сторінка для підрядників'}
          </h1>
          <p className="mt-1 text-[13px] sm:text-[14px] lg:text-[16px] font-forum text-[#00000080]">
            {currentLanguage === 'en' && 'Access to key event information and documents'}
            {currentLanguage === 'ru' && 'Доступ ко всей ключевой информации и документам по ивенту'}
            {currentLanguage === 'ua' && 'Доступ до всієї ключової інформації та документів події'}
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-[#00000033]">
          <article className="min-h-[100px] p-3 sm:p-4 border-b sm:border-b border-[#00000033] xl:border-b-0 xl:border-r flex flex-col items-center justify-center text-center">
            <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum tracking-wide">{t.date}</p>
            <p className="text-[16px] sm:text-[20px] lg:text-[22px] font-forum leading-tight mt-1">
              {wedding.wedding_date && formatDate(wedding.wedding_date)}
            </p>
          </article>
          <article className="min-h-[100px] p-3 sm:p-4 border-b sm:border-b border-[#00000033] xl:border-b-0 xl:border-r flex flex-col items-center justify-center text-center">
            <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum tracking-wide">{t.venue}</p>
            <p className="text-[16px] sm:text-[20px] lg:text-[22px] font-forum leading-tight mt-1 break-words">
              {getCountryDisplay()}
            </p>
          </article>
          <article className="min-h-[100px] p-3 sm:p-4 border-b border-[#00000033] sm:border-b-0 sm:border-r xl:border-r flex flex-col items-center justify-center text-center">
            <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum tracking-wide">{t.guestCount}</p>
            <p className="text-[16px] sm:text-[20px] lg:text-[22px] font-forum leading-tight mt-1">
              {wedding.guest_count}
            </p>
          </article>
          <article className="min-h-[100px] p-3 sm:p-4 flex flex-col items-center justify-center text-center">
            <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum tracking-wide">{t.coupleNames}</p>
            <p className="text-[16px] sm:text-[20px] lg:text-[22px] font-forum leading-tight mt-1 break-words">
              {getCoupleName()}
            </p>
          </article>
        </section>

        {(wedding.contractor_venue_address || wedding.contractor_maps_url) && (
          <div className="-mt-px border border-[#00000033] border-t-0 px-3 py-3 sm:py-4 text-center">
            {wedding.contractor_maps_url ? (
              <a
                href={normalizeMapsUrl(wedding.contractor_maps_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] sm:text-[13px] font-forum text-[#00000080] hover:text-black underline underline-offset-2 break-words inline-block max-w-full"
              >
                {wedding.contractor_venue_address?.trim() || 'Google Maps'}
              </a>
            ) : (
              <p className="text-[12px] sm:text-[13px] font-forum text-[#00000080] break-words">{wedding.contractor_venue_address}</p>
            )}
          </div>
        )}

        <section className="-mt-px grid grid-cols-1 lg:grid-cols-2 border border-[#00000033]">
          <article className="p-3 sm:p-4 border-b lg:border-b-0 border-[#00000033] lg:border-r text-center">
            <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-forum leading-tight">{t.documents}</h2>
            <ul className="mt-2 space-y-1">
              {documents.map((doc) => (
                <li key={doc.id} className="py-1 flex items-center justify-center gap-2">
                  <a
                    href={doc.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[15px] sm:text-[16px] lg:text-[18px] font-forum font-light underline underline-offset-4 hover:opacity-70 transition-opacity break-words"
                  >
                    {getDocumentName(doc)}
                  </a>
                  <img
                    src={downloadIcon}
                    alt="Download"
                    className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] lg:w-[22px] lg:h-[22px] shrink-0"
                  />
                </li>
              ))}
            </ul>
          </article>

          <article className="p-3 sm:p-4 text-center flex flex-col items-center justify-center">
            <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-forum leading-tight">{t.dressCode}</h2>
            <p className="text-[15px] sm:text-[17px] lg:text-[20px] font-forum font-light mt-2 leading-relaxed max-w-[520px]">
              {wedding.contractor_dress_code || wedding.dress_code || 'N/A'}
            </p>
          </article>
        </section>

        <section className="-mt-px border-y border-[#00000033] p-0">
          {/* Big header removed; headings are shown per block below */}
          <div>
            <article className="text-center pt-3 sm:pt-4">
              <p className="text-[22px] sm:text-[26px] lg:text-[32px] font-forum font-bold mb-4">{t.organizer}</p>

              {(() => {
                const parsed = tryParseJson<{
                  phone?: string;
                  names?: Record<'en' | 'ru' | 'ua', string>;
                }>(wedding.contractor_organizer_contacts);

                const name = parsed?.names ? getLocalizedName(parsed.names) : '';
                const phone = parsed?.phone ? formatPhonePretty(parsed.phone) : '';

                return (
                  <div className="border-y border-[#00000033] overflow-hidden w-full">
                    <div className="grid grid-cols-2 text-center">
                      <div className="p-2 sm:p-3">
                        <p className="text-[16px] sm:text-[17px] lg:text-[17px] font-forum font-light">{name || '—'}</p>
                      </div>
                      <div className="p-2 sm:p-3">
                        <p className="text-[12px] sm:text-[13px] lg:text-[13px] font-forum font-light">{phone || '—'}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </article>

            <article className="text-center mt-0 pt-3 sm:pt-4 border-t border-[#00000033]">
              <p className="text-[22px] sm:text-[26px] lg:text-[32px] font-forum font-bold mb-4">{t.coordinators}</p>

              {(() => {
                const parsed = tryParseJson<{
                  items?: Array<{
                    name?: Record<'en' | 'ru' | 'ua', string>;
                    responsibility?: Record<'en' | 'ru' | 'ua', string>;
                    phone?: string;
                  }>;
                }>(wedding.contractor_coordinator_contacts);

                const items = parsed?.items || [];

                return (
                  <div className="w-full">
                    {items.length === 0 ? (
                      <div className="p-3">
                        <p className="text-[14px] font-forum text-[#00000060] italic">—</p>
                      </div>
                    ) : (
                      items.map((item, idx) => {
                        const name = getLocalizedName(item.name);
                        const responsibility = getLocalizedName(item.responsibility);
                        const phone = item.phone ? formatPhonePretty(item.phone) : '';
                        return (
                          <div
                            key={idx}
                            className="p-3 sm:p-4 border-[#00000033]"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 text-center">
                              <div className="py-1">
                                <p className="text-[16px] sm:text-[17px] lg:text-[17px] font-forum font-light">{name || '—'}</p>
                              </div>
                              <div className="py-1">
                                <p className="text-[12px] sm:text-[13px] font-forum font-light">{phone || '—'}</p>
                              </div>
                              <div className="py-1">
                                <p className="text-[12px] sm:text-[13px] font-forum font-light">{responsibility || '—'}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()}
            </article>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ContractorDashboard;
