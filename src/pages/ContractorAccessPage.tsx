import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import type { Wedding, ContractorDocument } from '../types';
import { contractorService } from '../services/contractorService';
import { getInitialLanguage } from '../utils/languageUtils';
import downloadIcon from '../assets/download.svg';
import logo from '../assets/logoV3.svg';
import secondScreen from '../assets/bgJSSS.jpg';
import arrowRight from '../assets/arrow-right.svg';
import logoV2 from '../assets/logoV2.svg';
import languageIcon from '../assets/language.svg';

const ContractorAccessPage = () => {
  const { token } = useParams<{ token: string }>();

  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ru' | 'ua'>(getInitialLanguage());
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [documents, setDocuments] = useState<ContractorDocument[]>([]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const savedPassword = sessionStorage.getItem(`contractor_access_${token}`);
    if (savedPassword) {
      setPassword(savedPassword);
      void authenticate(savedPassword);
    }
  }, [token]);

  const authenticate = async (passwordToCheck: string) => {
    if (!token) {
      setError('Invalid link');
      return;
    }

    setLoading(true);
    setError(null);

    const { wedding: weddingData, error: weddingError } = await contractorService.getContractorWeddingByAccess(
      token,
      passwordToCheck
    );

    if (weddingError || !weddingData) {
      setLoading(false);
      setError(weddingError || 'Invalid link or password');
      setAuthorized(false);
      return;
    }

    const { documents: docs, error: docsError } = await contractorService.getContractorDocumentsByAccess(token, passwordToCheck);

    if (docsError) {
      setLoading(false);
      setError(docsError);
      return;
    }

    setWedding(weddingData);
    setDocuments(docs);
    setAuthorized(true);
    sessionStorage.setItem(`contractor_access_${token}`, passwordToCheck);
    setLoading(false);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    await authenticate(password);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();

    const monthNames = {
      en: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
      ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
      ua: ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'],
    };

    return `${day} ${monthNames[currentLanguage][monthIndex]} ${year}`;
  };

  const calculateDaysUntilEvent = (dateString: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateString);
    eventDate.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
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

  const getDocumentName = (doc: ContractorDocument): string => {
    if (currentLanguage === 'en' && doc.name_en) return doc.name_en;
    if (currentLanguage === 'ru' && doc.name_ru) return doc.name_ru;
    if (currentLanguage === 'ua' && doc.name_ua) return doc.name_ua;
    return doc.name || doc.name_en || doc.name_ru || doc.name_ua || '';
  };

  const handleDownload = (url: string, filename: string) => {
    let downloadUrl = url;

    // Convert Google Drive sharing links to direct download links
    if (url.includes('drive.google.com')) {
      // Extract file ID from various Google Drive URL formats
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        const fileId = fileIdMatch[1];
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }

    // For Dropbox, convert sharing links to direct download
    if (url.includes('dropbox.com')) {
      downloadUrl = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '?dl=1');
    }

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatContactText = (text: string) => {
    // Convert telegram usernames to clickable links
    const parts = text.split('\n');
    return parts.map((line, index) => {
      // Match @username pattern
      const telegramMatch = line.match(/@([a-zA-Z0-9_]+)/);
      if (telegramMatch) {
        const username = telegramMatch[1];
        const beforeUsername = line.substring(0, line.indexOf('@'));
        const afterUsername = line.substring(line.indexOf('@') + username.length + 1);
        return (
          <span key={index}>
            {beforeUsername}
            <a
              href={`https://t.me/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-forum hover:opacity-70 transition-opacity"
            >
              @{username}
            </a>
            {afterUsername}
            {index < parts.length - 1 && <br />}
          </span>
        );
      }
      return (
        <span key={index}>
          {line}
          {index < parts.length - 1 && <br />}
        </span>
      );
    });
  };

  const formatPhonePretty = (phoneRaw: string) => {
    const digits = phoneRaw.replace(/\D/g, '');
    if (!digits) return phoneRaw;

    // Normalize to 9-digit local number (after +380)
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

    // +380 67 127 13 23
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
    // Fallback: any available name.
    return names.ru || names.ua || names.en || '';
  };

  const translations = {
    en: {
      title: 'Contractor Access',
      password: 'Password',
      open: 'Open',
      eventDetails: 'Event details',
      keyDetails: 'Key details about your celebration',
      date: 'event date',
      locationLabel: 'location',
      venueLabel: 'venue',
      guestCount: 'number of Guests',
      coupleNames: 'couple names',
      days: 'days',
      daysTillEvent: 'till your celebration',
      dressCode: 'Dress Code',
      documents: 'Documents',
      attachedDocuments: '',
      organizerAndCoordinators: 'Organizer and Coordinators',
      organizer: 'Wedding planner',
      coordinators: 'Coordinators',
      nameLabel: 'Name',
      responsibilityLabel: 'Responsibility',
      phoneLabel: 'Phone',
    },
    ru: {
      title: 'Доступ для подрядчиков',
      password: 'Пароль',
      open: 'Открыть',
      eventDetails: 'Детали события',
      keyDetails: 'Ключевые детали вашего праздника',
      date: 'дата события',
      locationLabel: 'локация',
      venueLabel: 'место',
      guestCount: 'количество гостей',
      coupleNames: 'имена пары',
      days: 'дней',
      daysTillEvent: 'до события',
      dressCode: 'Дресс-код',
      documents: 'Документы',
      attachedDocuments: '',
      organizerAndCoordinators: 'Контакты организатора и координаторов',
      organizer: 'Организатор',
      coordinators: 'Координаторы',
      nameLabel: 'Имя',
      responsibilityLabel: 'Зона ответственности',
      phoneLabel: 'Номер телефона',
    },
    ua: {
      title: 'Доступ для підрядників',
      password: 'Пароль',
      open: 'Відкрити',
      eventDetails: 'Деталі події',
      keyDetails: 'Ключові деталі вашого свята',
      date: 'дата події',
      locationLabel: 'локація',
      venueLabel: 'місце',
      guestCount: 'кількість гостей',
      coupleNames: 'імена пари',
      days: 'днів',
      daysTillEvent: 'до події',
      dressCode: 'Дрес-код',
      documents: 'Документи',
      attachedDocuments: '',
      organizerAndCoordinators: 'Контакти організатора і координаторів',
      organizer: 'Організатор',
      coordinators: 'Координатори',
      nameLabel: "Ім'я",
      responsibilityLabel: 'Зона відповідальності',
      phoneLabel: 'Номер телефону',
    },
  };

  const t = translations[currentLanguage];

  if (!authorized) {
    // Login screen should be 1:1 with /login styles and always in English.
    const tLogin = translations.en;
    return (
      <div className="relative min-h-screen w-full overflow-x-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url(${secondScreen})`,
            backgroundPosition: 'center 35%',
          }}
        />
        {/* Dark radial overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%)',
          }}
        />

        <div className="relative z-20 flex flex-col items-center justify-center min-h-screen h-screen py-6 px-4">
          {/* White logo centered (like /login) */}
          <div className="mb-5 sm:mb-6">
            <img
              src={logoV2}
              alt="logo"
              className="w-auto h-auto max-w-[85vw] sm:max-w-[80vw] md:max-w-[520px]"
              style={{ maxHeight: '120px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
          </div>

          <form
            onSubmit={handleLogin}
            className="relative bg-[#FBF9F5B2] backdrop-blur-sm w-full max-w-[92vw] sm:max-w-[340px] md:max-w-[420px] lg:max-w-[520px] xl:max-w-[540px] min-[1440px]:max-w-[735px] 2xl:max-w-[825px] p-7 sm:p-8 mx-4 flex flex-col items-center justify-center rounded-lg min-h-[340px] sm:min-h-[380px]"
          >
            <div className="flex flex-col items-center justify-center mb-8 w-full">
              <h1 className="text-black text-[16px] sm:text-[18px] md:text-[20px] lg:text-[18px] font-branch font-regular mt-2 mb-1.5 text-center">
                Enter the password
              </h1>
            </div>

            {/* Password only */}
            <div className="mb-7 self-start w-full">
              <label
                htmlFor="contractor-password"
                className="block text-sm font-gilroy mb-1.5 text-[10px] sm:text-[11px] md:text-[11px]"
                style={{ color: 'black', fontWeight: 400 }}
              >
                {tLogin.password}
              </label>
              <input
                id="contractor-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the password"
                autoComplete="off"
                className="w-full bg-transparent border-0 border-b-1 focus:outline-none focus:border-b-1 pb-2 font-gilroy text-[16px] sm:text-[12px] md:text-[12px] pl-1"
                style={{ borderColor: '#00000080', color: 'black', backgroundColor: 'transparent' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 border font-gilroy text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer relative overflow-hidden group"
              style={{ borderColor: 'black', color: 'black' }}
            >
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-[0.05] group-active:opacity-[0.1] transition-opacity duration-300" />
              <span className="relative z-10 font-branch text-[16px] sm:text-[18px]">
                {loading ? 'Loading...' : tLogin.open}
              </span>
              <img src={arrowRight} alt="arrow" className="relative z-10 w-4 h-4" />
            </button>

            {error && <div className="mt-4 text-sm font-branch text-red-600 text-center">{error}</div>}
          </form>
        </div>
      </div>
    );
  }

  if (!wedding) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#eae6db]">
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-[30px] xl:px-[30px] min-[1500px]:px-[60px] py-4">
        {/* Header with logo, language switcher and description */}
        <header className="flex items-center justify-between mb-6 py-2 sm:py-3">
          <img src={logo} alt="logo" className="h-10 sm:h-12 w-auto" />
          <div className="flex-1 mx-4 text-center hidden sm:block">
            <p className="text-[13px] sm:text-[14px] font-forum text-[#00000080]">
              {currentLanguage === 'en' && 'Contractor page – key information and documents for your event'}
              {currentLanguage === 'ru' && 'Страница для подрядчиков — вся ключевая информация и документы по ивенту'}
              {currentLanguage === 'ua' && 'Сторінка для підрядників — уся ключова інформація та документи події'}
            </p>
          </div>
          <div className="relative self-stretch flex items-stretch">
            <button
              onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 cursor-pointer font-forum text-[18px] sm:text-[20px] font-light h-full w-full"
              style={{ pointerEvents: 'auto' }}
            >
              <span className="text-[14px] sm:text-[16px] uppercase text-[#00000080]">{currentLanguage}</span>
              <img src={languageIcon} alt="language" className="h-2.5 w-3 sm:h-3 sm:w-4" />
            </button>

            {isLanguageMenuOpen && (
              <>
                <div className="fixed inset-0 z-60" onClick={() => setIsLanguageMenuOpen(false)} />
                <div className="absolute right-0 top-full bg-[#eae6db] border border-[#00000033] z-70 overflow-hidden shadow-lg w-full">
                  {currentLanguage !== 'en' && (
                    <button
                      onClick={() => {
                        const lang = 'en';
                        setCurrentLanguage(lang);
                        localStorage.setItem('preferredLanguage', lang);
                        setIsLanguageMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center px-4 py-3 text-[20px] font-forum font-light uppercase cursor-pointer text-[#00000080]"
                    >
                      EN
                    </button>
                  )}
                  {currentLanguage !== 'ru' && (
                    <button
                      onClick={() => {
                        const lang = 'ru';
                        setCurrentLanguage(lang);
                        localStorage.setItem('preferredLanguage', lang);
                        setIsLanguageMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center px-4 py-3 text-[20px] font-forum font-light uppercase cursor-pointer text-[#00000080]"
                    >
                      RU
                    </button>
                  )}
                  {currentLanguage !== 'ua' && (
                    <button
                      onClick={() => {
                        const lang = 'ua';
                        setCurrentLanguage(lang);
                        localStorage.setItem('preferredLanguage', lang);
                        setIsLanguageMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center px-4 py-3 text-[20px] font-forum font-light uppercase cursor-pointer text-[#00000080]"
                    >
                      UA
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {/* Event details (table-like like client/couple page) */}
        <section className="border-y border-[#00000033] bg-transparent w-[100vw] relative left-1/2 -translate-x-1/2">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
            <div className="p-3 sm:p-4 border-b lg:border-b-0 border-[#00000033]">
              <h2 className="text-[22px] sm:text-[26px] lg:text-[32px] font-forum leading-tight text-left">
                {t.eventDetails}
              </h2>
              <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum font-light mt-1 text-left">
                {t.keyDetails}
              </p>
            </div>

            <div className="flex flex-col lg:flex-row divide-y divide-[#00000033]">
              <div className="flex-1 p-3 sm:p-4 text-center">
                <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum font-light mb-1">{t.date}</p>
                <p className="text-[16px] sm:text-[18px] lg:text-[22px] font-forum font-bold leading-tight">
                  {wedding.wedding_date ? formatDate(wedding.wedding_date) : ''}
                </p>
              </div>

              <div className="flex-1 p-3 sm:p-4 text-center">
                <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum font-light mb-1">{t.locationLabel}</p>
                <p className="text-[16px] sm:text-[18px] lg:text-[22px] font-forum font-bold leading-tight break-words">
                  {getCountryDisplay()}
                </p>
              </div>

              <div className="flex-1 p-3 sm:p-4 text-center">
                <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum font-light mb-1">{t.venueLabel}</p>
                <p className="text-[16px] sm:text-[18px] lg:text-[22px] font-forum font-bold leading-tight">
                  {wedding.venue}
                </p>
                {(wedding.contractor_venue_address || wedding.contractor_maps_url) && (
                  <div className="mt-2">
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
                      <p className="text-[12px] sm:text-[13px] font-forum text-[#00000080] break-words">
                        {wedding.contractor_venue_address}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 p-3 sm:p-4 text-center">
                <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum font-light mb-1">{t.guestCount}</p>
                <p className="text-[16px] sm:text-[18px] lg:text-[22px] font-forum font-bold leading-tight">{wedding.guest_count}</p>
              </div>

              <div className="flex-1 p-3 sm:p-4 text-center">
                <p className="text-[16px] sm:text-[18px] lg:text-[22px] font-forum font-bold leading-tight mb-1">
                  {wedding.wedding_date ? calculateDaysUntilEvent(wedding.wedding_date) : 0} {t.days}
                </p>
                <p className="text-[12px] sm:text-[13px] font-forum font-light text-[#00000080] leading-tight">{t.daysTillEvent}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Documents and Dress Code (accent on values) */}
        <section className="-mt-px grid grid-cols-1 lg:grid-cols-2 border-y border-[#00000033] w-[100vw] relative left-1/2 -translate-x-1/2">
          <article className="p-3 sm:p-4 border-b lg:border-b-0 lg:border-r border-[#00000033] text-center">
            <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum tracking-wide">{t.documents}</p>
            {t.attachedDocuments && (
              <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum mt-1">{t.attachedDocuments}</p>
            )}
            {documents.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {documents.map((doc) => (
                  <li key={doc.id} className="py-1 flex items-center justify-center gap-2">
                    <a
                      href={doc.link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[16px] sm:text-[18px] lg:text-[20px] font-forum font-bold underline underline-offset-4 hover:opacity-70 transition-opacity break-words"
                    >
                      {getDocumentName(doc)}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDownload(doc.link || '', getDocumentName(doc))}
                      className="shrink-0"
                      title="Download"
                    >
                      <img
                        src={downloadIcon}
                        alt="Download"
                        className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] lg:w-[22px] lg:h-[22px]"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] font-forum text-[#00000060] italic mt-2">No documents</p>
            )}
          </article>

          <article className="p-3 sm:p-4 text-center flex flex-col items-center justify-center">
            <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum tracking-wide">{t.dressCode}</p>
            <p className="text-[16px] sm:text-[18px] lg:text-[20px] font-forum font-bold mt-2 leading-relaxed max-w-[520px]">
              {wedding.contractor_dress_code || 'N/A'}
            </p>
          </article>
        </section>

        {/* Contacts */}
        <section className="border-b border-[#00000033] p-0 w-[100vw] relative left-1/2 -translate-x-1/2">
          {/* Big header removed; headings are shown per block below */}
          <div>
            <article className="text-center pt-3 sm:pt-4">
              <p className="text-[16px] sm:text-[18px] lg:text-[20px] font-forum font-light mb-4">{t.organizer}</p>

              {(() => {
                const parsed = tryParseJson<{
                  phone?: string;
                  names?: Record<'en' | 'ru' | 'ua', string>;
                }>(wedding.contractor_organizer_contacts);

                if (!parsed?.names) {
                  return (
                    <div className="text-[14px] sm:text-[15px] lg:text-[17px] font-forum font-light leading-relaxed px-3 sm:px-4">
                      {wedding.contractor_organizer_contacts ? formatContactText(wedding.contractor_organizer_contacts) : '—'}
                    </div>
                  );
                }

                const name = getLocalizedName(parsed.names);
                const phone = parsed.phone ? formatPhonePretty(parsed.phone) : '';

                return (
                  <div className="border-b border-[#00000033] overflow-hidden w-full">
                    <div className="grid grid-cols-2 text-center">
                      <div className="p-2 sm:p-3">
                        <p className="text-[16px] sm:text-[18px] lg:text-[22px] font-forum font-bold leading-tight">{name || '—'}</p>
                      </div>
                      <div className="p-2 sm:p-3">
                        <p className="text-[16px] sm:text-[18px] lg:text-[22px] font-forum font-bold leading-tight">{phone || '—'}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </article>

            <article className="text-center mt-0 pt-3 sm:pt-4">
              <p className="text-[16px] sm:text-[18px] lg:text-[20px] font-forum font-light mb-4">{t.coordinators}</p>

              {(() => {
                const parsed = tryParseJson<{
                  items?: Array<{
                    name?: Record<'en' | 'ru' | 'ua', string>;
                    responsibility?: Record<'en' | 'ru' | 'ua', string>;
                    phone?: string;
                  }>;
                }>(wedding.contractor_coordinator_contacts);

                if (!parsed?.items) {
                  return (
                    <div className="text-[14px] sm:text-[15px] lg:text-[17px] font-forum font-light leading-relaxed px-3 sm:px-4">
                      {wedding.contractor_coordinator_contacts ? formatContactText(wedding.contractor_coordinator_contacts) : '—'}
                    </div>
                  );
                }

                const items = parsed.items;

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

export default ContractorAccessPage;
