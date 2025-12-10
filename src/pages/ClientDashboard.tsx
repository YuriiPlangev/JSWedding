import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { weddingService, taskService, documentService } from '../services/weddingService';
import type { Wedding, Task, Document } from '../types';
import Header from '../components/Header';
import TasksList from '../components/TasksList';
import DocumentsList from '../components/DocumentsList';
import Presentation from '../components/Presentation';
import placeCircle from '../assets/placeCircle.svg';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ru' | 'ua'>('ru');
  const [showSplash, setShowSplash] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadWeddingData();
    }
  }, [user]);

  // Автоматически запускаем анимацию через 2.5 секунды после загрузки данных
  useEffect(() => {
    if (!loading && wedding && showSplash) {
      const timer = setTimeout(() => {
        setIsAnimating(true);
        // После завершения анимации скрываем заглушку
        setTimeout(() => {
          setShowSplash(false);
        }, 1000); // Длительность анимации
      }, 1500); // Показываем заглушку 2.5 секунды

      return () => clearTimeout(timer);
    }
  }, [loading, wedding, showSplash]);

  const loadWeddingData = async (forceRefresh: boolean = false) => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Загружаем свадьбу клиента (используем кеш, если не принудительное обновление)
      const weddingData = await weddingService.getClientWedding(user.id, !forceRefresh);
      
      if (!weddingData) {
        setError('У вас пока нет активной свадьбы. Обратитесь к организатору.');
        setLoading(false);
        return;
      }

      setWedding(weddingData);

      // Загружаем задания (используем кеш, если не принудительное обновление)
      const tasksData = await taskService.getWeddingTasks(weddingData.id, !forceRefresh);
      setTasks(tasksData);

      // Загружаем документы (используем кеш, если не принудительное обновление)
      const documentsData = await documentService.getWeddingDocuments(weddingData.id, !forceRefresh);
      setDocuments(documentsData);
    } catch (err) {
      console.error('Error loading wedding data:', err);
      setError('Ошибка при загрузке данных. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      const blob = await documentService.downloadDocument(document);
      
      if (blob) {
        // Создаем ссылку для скачивания
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Ошибка при скачивании документа');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateDaysUntilWedding = (weddingDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Устанавливаем начало дня для точного расчета
    
    const wedding = new Date(weddingDate);
    wedding.setHours(0, 0, 0, 0);
    
    const diffTime = wedding.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  // Показываем заглушку, пока идет загрузка или пока showSplash активен
  if (showSplash && (loading || wedding)) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <Header
          onLogout={logout}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
        />

        {/* Заглушка с анимацией */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          <div
            className={`text-center transition-all duration-1000 ease-in-out ${
              isAnimating
                ? 'transform -translate-y-full opacity-0'
                : 'transform translate-y-0 opacity-100'
            }`}
            style={{ visibility: loading ? 'hidden' : 'visible' }}
          >
            {/* Имена пары */}
            <h1 className="text-[48px] sm:text-[72px] md:text-[100px] lg:text-[150px] font-sloop text-black  md:mb-6 px-4">
              {/* {wedding?.couple_name_1} & {wedding?.couple_name_2} */} Yurii & Angelina
            </h1>
            {/* Приветственный текст */}
            <p className="text-[60px] sm:text-[32px] md:text-[48px] lg:text-[60px] font-gilroy text-black px-4">
              Welcome to your wedding organization space!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Контент до презентации - на всю высоту экрана */}
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <Header
          onLogout={logout}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
        />

        <main className="flex-1 flex flex-col">
          {/* Приветствие */}
          <div className=" border-b border-[#000000B2] py-6 px-15">
            <h2 className="text-[32px] font-branch">
            {wedding?.couple_name_1} & {wedding?.couple_name_2} Welcome to your weeding organization space!
            </h2>
            <p className="text-[16px] font-gilroy font-light text-[#4D3628]">
            View and control every stage of your celebration
            </p>
          </div>

          {/* Ошибка */}
          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {wedding && (
            <>
              {/* Основная информация о свадьбе */}
              <div className='border-b border-[#000000B2] flex pl-15 flex-shrink-0'>
                <div className='border-r border-[#00000033] py-6 pr-14'>
                  <h2 className='text-[50px] font-branch'>
                  Weeding details
                  </h2>
                  <p className='text-[24px] font-gilroy font-light text-[#00000080]'>
                  Key details about your special day
                  </p>
                </div>
                <div className='flex items-center flex-1'>
                  <ul className='flex flex-row gap-4 px-15 justify-between w-full'>
                    <li className='flex flex-col justify-center'>
                      <p className='text-[16px] text-[#00000080] font-gilroy font-light'>wedding date</p>
                      <p className='text-[32px] font-gilroy font-bold'>{formatDate(wedding.wedding_date)}</p>
                    </li>
                    <li className='flex flex-col justify-center'>
                      <p className='text-[16px] text-[#00000080] font-gilroy font-light'>Venue</p>
                      <p className='text-[32px] font-gilroy font-bold'>{wedding.venue}</p>
                    </li>
                    <li className='flex flex-col justify-center'>
                      <div className='flex items-center gap-2'>
                      <p className='text-[16px] text-[#00000080] font-gilroy font-light'>Celebration Place</p> <img src={placeCircle} alt="" />
                      </div>
                      <p className='text-[32px] font-gilroy font-bold text-[#00000080]'>Awaiting Selection</p>
                    </li>
                    <li className='flex flex-col justify-center'>
                      <p className='text-[16px] text-[#00000080]  font-gilroy font-light'>Number of Guests</p>
                      <p className='text-[32px] font-gilroy font-bold'>{wedding.guest_count}</p>
                    </li>
                    <li className='flex flex-col justify-center'>
                      <p className='text-[32px] font-gilroy font-light'>
                        {wedding ? calculateDaysUntilWedding(wedding.wedding_date) : 0} days
                      </p>
                      <p className='text-[24px] font-gilroy font-light'>till your celebration </p>
                    </li>
                  </ul>
                </div>
              </div>

              <div className=" flex border-b border-[#00000033] flex-1">
                {/* Задания */}
                <div className='border-r border-[#000000B2] min-w-3/7 pl-15 self-stretch'>
                  <div className='py-4'>
                  <h2 className='text-[44px] font-branch mb-3'>
                  Tasks
                  </h2>
                  <p className='text-[24px] font-gilroy font-light text-[#00000080]'>
                  Wedding planning checklist you need to complete
                  </p>
                  </div>
                  <TasksList tasks={tasks} />
                </div>

                {/* Документы */}
                <div className='w-full h-full'>
                  <div className='pt-4 px-15' >
                  <h2 className='text-[44px] font-branch mb-3'>
                    Documents
                  </h2>
                  <p className='text-[16px] font-gilroy font-light text-[#00000080]'>
                  pinned documents
                  </p>
                  </div>
                  <DocumentsList documents={documents} />
                </div>
                
              </div>
            </>
          )}
        </main>
      </div>

      {/* Презентация - на всю высоту экрана */}
      {wedding && <Presentation />}
    </div>
  );
};

export default ClientDashboard;
