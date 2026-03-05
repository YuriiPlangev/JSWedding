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
    const name1 = currentLanguage === 'ru' && wedding.couple_name_1_ru ? wedding.couple_name_1_ru : wedding.couple_name_1_en;
    const name2 = currentLanguage === 'ru' && wedding.couple_name_2_ru ? wedding.couple_name_2_ru : wedding.couple_name_2_en;
    return `${name1} & ${name2}`;
  };

  const translations = {
    en: {
      date: 'date',
      venue: 'venue',
      guestCount: 'guest count',
      coupleNames: 'couple names',
      dressCode: 'Dress Code',
      documents: 'Documents',
      attachedDocuments: 'Attached documents',
      organizerAndCoordinators: 'Organizer and Coordinators',
      organizer: 'Organizer',
      coordinators: 'Coordinators',
    },
    ru: {
      date: 'дата события',
      venue: 'локация',
      guestCount: 'количество гостей',
      coupleNames: 'имена пары',
      dressCode: 'Дресс-код',
      documents: 'Документы',
      attachedDocuments: 'Прикрепленные документы',
      organizerAndCoordinators: 'Контакты организатора и координаторов',
      organizer: 'Организатор',
      coordinators: 'Координаторы',
    },
    ua: {
      date: 'дата події',
      venue: 'локація',
      guestCount: 'кількість гостей',
      coupleNames: 'імена пари',
      dressCode: 'Дрес-код',
      documents: 'Документи',
      attachedDocuments: 'Прикріплені документи',
      organizerAndCoordinators: 'Контакти організатора і координаторів',
      organizer: 'Організатор',
      coordinators: 'Координатори',
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
              {wedding.venue}
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

        <section className="-mt-px grid grid-cols-1 lg:grid-cols-2 border border-[#00000033]">
          <article className="p-3 sm:p-4 border-b lg:border-b-0 border-[#00000033] lg:border-r text-center">
            <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-forum leading-tight">{t.documents}</h2>
            <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum mt-1">{t.attachedDocuments}</p>
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

        <section className="-mt-px border border-[#00000033] p-3 sm:p-4">
          <h2 className="text-[24px] sm:text-[28px] lg:text-[34px] font-forum leading-tight text-center">{t.organizerAndCoordinators}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 mt-3">
            <article className="text-center lg:border-r border-[#00000033] lg:pr-4">
              <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum mb-2">{t.organizer}</p>
              <p className="text-[14px] sm:text-[15px] lg:text-[17px] font-forum font-light whitespace-pre-line leading-relaxed">
                {wedding.contractor_organizer_contacts || wedding.organizer_contacts || 'N/A'}
              </p>
            </article>
            <article className="text-center mt-3 lg:mt-0 lg:pl-4">
              <p className="text-[12px] sm:text-[13px] text-[#00000080] font-forum mb-2">{t.coordinators}</p>
              <p className="text-[14px] sm:text-[15px] lg:text-[17px] font-forum font-light whitespace-pre-line leading-relaxed">
                {wedding.contractor_coordinator_contacts || 'N/A'}
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ContractorDashboard;
