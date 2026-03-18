import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import type { Wedding, ContractorDocument } from '../types';
import { contractorService } from '../services/contractorService';
import { getInitialLanguage } from '../utils/languageUtils';
import downloadIcon from '../assets/download.svg';
import logo from '../assets/logoV3.svg';

const ContractorAccessPage = () => {
  const { token } = useParams<{ token: string }>();

  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ru' | 'ua'>(getInitialLanguage());
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
      en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
      ua: ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'],
    };

    return `${day} ${monthNames[currentLanguage][monthIndex]} ${year}`;
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

  const getCoupleName = () => {
    if (!wedding) return '';
    const name1 =
      currentLanguage === 'ru' && wedding.couple_name_1_ru
        ? wedding.couple_name_1_ru
        : wedding.couple_name_1_en || '';
    const name2 =
      currentLanguage === 'ru' && wedding.couple_name_2_ru
        ? wedding.couple_name_2_ru
        : wedding.couple_name_2_en || '';
    return [name1, name2].map((s) => (s || '').trim()).filter(Boolean).join(' & ');
  };

  const translations = {
    en: {
      title: 'Contractor Access',
      password: 'Password',
      open: 'Open',
      date: 'date',
      venue: 'venue',
      guestCount: 'guest count',
      coupleNames: 'couple names',
      dressCode: 'Dress Code',
      documents: 'Documents',
      attachedDocuments: '',
      organizerAndCoordinators: 'Organizer and Coordinators',
      organizer: 'Organizer',
      coordinators: 'Coordinators',
    },
    ru: {
      title: 'Доступ для подрядчиков',
      password: 'Пароль',
      open: 'Открыть',
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
    },
    ua: {
      title: 'Доступ для підрядників',
      password: 'Пароль',
      open: 'Відкрити',
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
    },
  };

  const t = translations[currentLanguage];

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#eae6db] flex items-center justify-center px-4 py-6">
        <div className="max-w-[480px] w-full">
          <div className="flex justify-between items-center mb-8">
            <img src={logo} alt="logo" className="h-12 w-auto" />
            <select
              value={currentLanguage}
              onChange={(e) => {
                const lang = e.target.value as 'en' | 'ru' | 'ua';
                setCurrentLanguage(lang);
                localStorage.setItem('preferredLanguage', lang);
              }}
              className="border border-[#00000033] bg-white rounded-lg pl-3 pr-8 py-2 font-forum text-[14px] cursor-pointer hover:border-[#00000066] transition-colors appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2012%2012%27%3E%3cpath%20fill%3D%27%23333%27%20d%3D%27M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%27%2F%3E%3c%2Fsvg%3E')] bg-[position:right_0.5rem_center] bg-no-repeat"
            >
              <option value="en">EN</option>
              <option value="ru">RU</option>
              <option value="ua">UA</option>
            </select>
          </div>

          <div className="bg-white border border-[#00000033] rounded-lg p-8 shadow-sm">
            <h1 className="text-[32px] font-forum font-bold text-black mb-6 text-center">{t.title}</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[16px] font-forum font-bold text-black mb-2">{t.password}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white text-[16px]"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-[14px] font-forum text-red-600 text-center">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-black text-white rounded-lg font-forum text-[16px] hover:bg-[#000000DD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : t.open}
              </button>
            </form>
          </div>
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
          <img src={logo} alt="logo" className="h-14 sm:h-16 w-auto" />
          <div className="flex-1 mx-4 text-center hidden sm:block">
            <p className="text-[13px] sm:text-[14px] font-forum text-[#00000080]">
              {currentLanguage === 'en' && 'Contractor page – key information and documents for your event'}
              {currentLanguage === 'ru' && 'Страница для подрядчиков — вся ключевая информация и документы по ивенту'}
              {currentLanguage === 'ua' && 'Сторінка для підрядників — уся ключова інформація та документи події'}
            </p>
          </div>
          <select
            value={currentLanguage}
            onChange={(e) => {
              const lang = e.target.value as 'en' | 'ru' | 'ua';
              setCurrentLanguage(lang);
              localStorage.setItem('preferredLanguage', lang);
            }}
            className="border border-[#00000033] bg-white rounded-lg pl-3 pr-8 py-2 font-forum text-[14px] cursor-pointer hover:border-[#00000066] transition-colors appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2012%2012%27%3E%3cpath%20fill%3D%27%23333%27%20d%3D%27M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%27%2F%3E%3c%2Fsvg%3E')] bg-[position:right_0.5rem_center] bg-no-repeat"
          >
            <option value="en">EN</option>
            <option value="ru">RU</option>
            <option value="ua">UA</option>
          </select>
        </header>

        {/* Wedding details grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-[#00000033]">
          <article className="min-h-[100px] p-3 sm:p-4 border-b sm:border-b border-[#00000033] xl:border-b-0 xl:border-r flex flex-col items-center justify-center text-center">
            <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum tracking-wide">{t.date}</p>
            <p className="text-[16px] sm:text-[20px] lg:text-[22px] font-forum leading-tight mt-1">
              {wedding.wedding_date && formatDate(wedding.wedding_date)}
            </p>
          </article>
          <article className="min-h-[100px] p-3 sm:p-4 border-b sm:border-b border-[#00000033] xl:border-b-0 xl:border-r flex flex-col items-center justify-center text-center">
            <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum tracking-wide">{t.venue}</p>
            <p className="text-[16px] sm:text-[20px] lg:text-[22px] font-forum leading-tight mt-1 break-words">{wedding.venue}</p>
          </article>
          <article className="min-h-[100px] p-3 sm:p-4 border-b border-[#00000033] sm:border-b-0 sm:border-r xl:border-r flex flex-col items-center justify-center text-center">
            <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum tracking-wide">{t.guestCount}</p>
            <p className="text-[16px] sm:text-[20px] lg:text-[22px] font-forum leading-tight mt-1">{wedding.guest_count}</p>
          </article>
          <article className="min-h-[100px] p-3 sm:p-4 flex flex-col items-center justify-center text-center">
            <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum tracking-wide">{t.coupleNames}</p>
            <p className="text-[16px] sm:text-[20px] lg:text-[22px] font-forum leading-tight mt-1 break-words">{getCoupleName()}</p>
          </article>
        </section>

        {/* Documents and Dress Code */}
        <section className="-mt-px grid grid-cols-1 lg:grid-cols-2 border border-[#00000033]">
          <article className="p-3 sm:p-4 border-b lg:border-b-0 border-[#00000033] lg:border-r text-center">
            <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-forum leading-tight">{t.documents}</h2>
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
                      className="text-[15px] sm:text-[16px] lg:text-[18px] font-forum font-light underline underline-offset-4 hover:opacity-70 transition-opacity break-words"
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
            <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-forum leading-tight">{t.dressCode}</h2>
            <p className="text-[15px] sm:text-[17px] lg:text-[20px] font-forum font-light mt-2 leading-relaxed max-w-[520px]">
              {wedding.contractor_dress_code || 'N/A'}
            </p>
          </article>
        </section>

        {/* Contacts */}
        <section className="-mt-px border border-[#00000033] p-3 sm:p-4">
          <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-forum leading-tight text-center">{t.organizerAndCoordinators}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 mt-3">
            <article className="text-center lg:border-r border-[#00000033] lg:pr-4">
              <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum mb-2">{t.organizer}</p>
              <div className="text-[14px] sm:text-[15px] lg:text-[17px] font-forum font-light leading-relaxed">
                {wedding.contractor_organizer_contacts ? formatContactText(wedding.contractor_organizer_contacts) : 'N/A'}
              </div>
            </article>
            <article className="text-center mt-3 lg:mt-0 lg:pl-4">
              <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum mb-2">{t.coordinators}</p>
              <div className="text-[14px] sm:text-[15px] lg:text-[17px] font-forum font-light leading-relaxed">
                {wedding.contractor_coordinator_contacts ? formatContactText(wedding.contractor_coordinator_contacts) : 'N/A'}
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ContractorAccessPage;
