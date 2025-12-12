import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { weddingService, taskService, documentService } from '../services/weddingService';
import type { Wedding, Task, Document } from '../types';
import Header from '../components/Header';
import TasksList from '../components/TasksList';
import DocumentsList from '../components/DocumentsList';
import MobileNotSupported from '../components/MobileNotSupported';
// import Presentation from '../components/Presentation';
import { getTranslation } from '../utils/translations';
import { getFontStyle } from '../utils/fontUtils';
import scrollDown from '../assets/scroll-down.svg';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Загружаем язык из localStorage при инициализации
  const getInitialLanguage = (): 'en' | 'ru' | 'ua' => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage === 'en' || savedLanguage === 'ru' || savedLanguage === 'ua') {
      return savedLanguage;
    }
    return 'ru';
  };

  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ru' | 'ua'>(getInitialLanguage());
  
  // Обработчик изменения языка с сохранением в localStorage
  const handleLanguageChange = (lang: 'en' | 'ru' | 'ua') => {
    setCurrentLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
  };

  const [isMobile, setIsMobile] = useState(false);
  const splashRef = useRef<HTMLDivElement>(null);

  // Проверка размера экрана для мобильных устройств
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint в Tailwind
    };

    // Проверяем при загрузке
    checkScreenSize();

    // Проверяем при изменении размера окна
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadWeddingData();
    }
  }, [user]);


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


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    
    const translations = getTranslation(currentLanguage);
    const monthNames = [
      translations.months.january,
      translations.months.february,
      translations.months.march,
      translations.months.april,
      translations.months.may,
      translations.months.june,
      translations.months.july,
      translations.months.august,
      translations.months.september,
      translations.months.october,
      translations.months.november,
      translations.months.december,
    ];
    
    const monthName = monthNames[monthIndex];
    
    return `${day} ${monthName} ${year}`;
  };

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    if (!wedding) return;
    
    // Обновляем статус задачи локально для мгновенного отклика
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, status: completed ? 'completed' : 'pending' }
          : task
      )
    );

    // Обновляем статус на сервере
    try {
      await taskService.updateTask(taskId, { 
        status: completed ? 'completed' : 'pending' 
      }, wedding.id);
    } catch (error) {
      console.error('Error updating task:', error);
      // В случае ошибки возвращаем предыдущее состояние
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: completed ? 'pending' : 'completed' }
            : task
        )
      );
    }
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

  // Показываем страницу для мобильных устройств, если экран меньше ноутбучного
  if (isMobile) {
    return (
      <MobileNotSupported 
        coupleName1={wedding?.couple_name_1}
        coupleName2={wedding?.couple_name_2}
      />
    );
  }

  return (
    <div className="relative">
      {/* Заглушка - первая секция */}
      {(loading || wedding) && (
        <div 
          ref={splashRef}
          className="relative h-screen w-full flex items-center justify-center"
        >
          <div className="text-center -mt-16">
            {/* Имена пары */}
            {wedding && (
              <h1 
                className="text-[36px] sm:text-[54px] md:text-[72px] lg:text-[58px] max-[1599px]:lg:text-[58px] min-[1600px]:lg:text-[90px] xl:text-[90px] max-[1599px]:xl:text-[76px] min-[1600px]:xl:text-[117px] font-sloop text-black px-4 leading-[1.1]"
              >
                {wedding.couple_name_1} <span className='font-sloop'> & </span>  {wedding.couple_name_2} 
              </h1>
            )}
            {/* Приветственный текст */}
            {(() => {
              const splashText = getTranslation(currentLanguage).welcome.splash;
              return (
                <p 
                  className="text-[18px] sm:text-[23px] md:text-[28px] lg:text-[23px] max-[1599px]:lg:text-[23px] min-[1600px]:lg:text-[36px] xl:text-[38px] max-[1599px]:xl:text-[30px] min-[1600px]:xl:text-[47px] text-black px-4 leading-[1.2] mt-1"
                  style={getFontStyle(splashText)}
                >
                  {splashText}
                </p>
              );
            })()}
          </div>
          
          {/* Scroll down indicator */}
          <div className="absolute bottom-4 lg:bottom-4 max-[1599px]:lg:bottom-4 min-[1600px]:xl:bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center">
            <img src={scrollDown} alt="scrollDown" className='animate-pulse-opacity brightness-0' />
            <p className='mt-2 text-black font-gilroy text-sm md:text-base lg:text-sm xl:text-base'>Scroll down to continue</p>
          </div>
        </div>
      )}

      {/* Основной контент - вторая секция */}
      {wedding && !loading && (
      <div className="relative min-h-screen flex flex-col">
        {/* Header внутри контента - появляется вместе с ним */}
        <Header
          onLogout={logout}
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
        />
        <main className="flex-1 flex flex-col font-forum">
          {/* Приветствие */}
          <div className="border-b border-[#00000033] py-6 max-[1599px]:py-3 md:max-[1599px]:py-4 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4 px-4 md:px-8 lg:px-12 xl:px-[60px]">
            <h2 
              className="text-[32px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[22px] min-[1300px]:max-[1599px]:text-[26px] font-forum leading-tight"
            >
              {wedding?.couple_name_1} <span className='font-forum'> & </span> {wedding?.couple_name_2}, {getTranslation(currentLanguage).dashboard.welcome}
            </h2>
            {(() => {
              const descText = getTranslation(currentLanguage).dashboard.viewControl;
              return (
                <p 
                  className="text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] font-forum font-light text-[#00000080] leading-tight mt-1"
                >
                  {descText}
                </p>
              );
            })()}
          </div>

          {/* Ошибка */}
          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-forum">{error}</p>
            </div>
          )}

          {wedding && (
            <>
              {/* Основная информация о свадьбе */}
              <div className='border-b border-[#00000033] flex flex-col lg:flex-row pl-4 md:pl-8 lg:pl-12 xl:pl-[60px] shrink-0'>
                <div className='border-r-0 lg:border-r border-[#00000033] border-b lg:border-b-0 py-2 lg:max-[1599px]:py-2 min-[1300px]:max-[1599px]:py-3 min-[1600px]:py-4 pr-4 max-[1599px]:pr-4 md:max-[1599px]:pr-6 lg:max-[1599px]:pr-8 min-[1300px]:max-[1599px]:pr-10'>
                  {(() => {
                    const titleText = getTranslation(currentLanguage).dashboard.weddingDetails;
                    return (
                      <h2 
                        className='text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] font-forum leading-tight'
                      >
                        {titleText}
                      </h2>
                    );
                  })()}
                  {(() => {
                    const descText = getTranslation(currentLanguage).dashboard.keyDetails;
                    return (
                      <p 
                        className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[16px] min-[1300px]:max-[1599px]:text-[18px] font-forum font-light text-[#00000080] leading-tight mt-[-1]'
                      >
                        {descText}
                      </p>
                    );
                  })()}
                </div>
                <div className='flex items-center flex-1'>
                  <ul className='flex flex-row flex-wrap lg:flex-nowrap gap-4 max-[1599px]:gap-3 lg:max-[1599px]:gap-3 min-[1300px]:max-[1599px]:gap-4 px-4 md:px-8 lg:px-8 xl:px-[60px] py-6 max-[1599px]:py-4 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4 justify-start lg:justify-between w-full'>
                    <li className='flex flex-col justify-center'>
                      {(() => {
                        const labelText = getTranslation(currentLanguage).dashboard.weddingDate;
                        return (
                          <p 
                            className='text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-forum font-light'
                          >
                            {labelText}
                          </p>
                        );
                      })()}
                      <p className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold'>{formatDate(wedding.wedding_date)}</p>
                    </li>
                    <li className='flex flex-col justify-center'>
                      {(() => {
                        const labelText = getTranslation(currentLanguage).dashboard.venue;
                        return (
                          <p 
                            className='text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-forum font-light'
                          >
                            {labelText}
                          </p>
                        );
                      })()}
                      <p className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold'>{wedding.country}</p>
                    </li>
                    <li className='flex flex-col justify-center'>
                      <div className='flex items-center gap-2'>
                        {(() => {
                          const labelText = getTranslation(currentLanguage).dashboard.celebrationPlace;
                          return (
                            <p 
                              className='text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-forum font-light'
                            >
                              {labelText}
                            </p>
                          );
                        })()}
                      </div>
                      <p className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold '>{wedding.venue}</p>
                    </li>
                    <li className='flex flex-col justify-center'>
                      {(() => {
                        const labelText = getTranslation(currentLanguage).dashboard.numberOfGuests;
                        return (
                          <p 
                            className='text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-forum font-light'
                          >
                            {labelText}
                          </p>
                        );
                      })()}
                      <p className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold'>{wedding.guest_count}</p>
                    </li>
                    <li className='flex flex-col justify-center'>
                      <p className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light'>
                        {wedding ? calculateDaysUntilWedding(wedding.wedding_date) : 0} {getTranslation(currentLanguage).dashboard.days}
                      </p>
                      {(() => {
                        const labelText = getTranslation(currentLanguage).dashboard.daysTillCelebration;
                        return (
                          <p 
                            className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[16px] min-[1300px]:max-[1599px]:text-[18px] font-forum font-light'
                          >
                            {labelText}
                          </p>
                        );
                      })()}
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row border-b border-[#00000033] flex-1 overflow-hidden">
                {/* Задания */}
                <div className='border-r-0 lg:border-r border-[#00000033] lg:min-w-3/7 pl-4 md:pl-8 lg:pl-12 xl:pl-[60px] self-stretch overflow-hidden flex flex-col'>
                  <div className='py-2 lg:max-[1599px]:py-2 min-[1300px]:max-[1599px]:py-3 min-[1600px]:py-4 pr-4 max-[1599px]:pr-4 md:max-[1599px]:pr-6 lg:max-[1599px]:pr-8 min-[1300px]:max-[1599px]:pr-10'>
                    {(() => {
                      const titleText = getTranslation(currentLanguage).dashboard.tasks;
                      return (
                        <h2 
                          className='text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] font-forum'
                        >
                          {titleText}
                        </h2>
                      );
                    })()}
                    {(() => {
                      const descText = getTranslation(currentLanguage).dashboard.tasksDescription;
                      return (
                        <p 
                          className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[16px] min-[1300px]:max-[1599px]:text-[18px] font-forum font-light text-[#00000080]'
                        >
                          {descText}
                        </p>
                      );
                    })()}
                  </div>
                  <div className='flex-1 overflow-y-auto'>
                    <TasksList 
                      tasks={tasks} 
                      onTaskToggle={handleTaskToggle}
                    />
                  </div>
                </div>

                {/* Документы */}
                <div className='w-full h-full flex flex-col overflow-hidden'>
                  <div className='pt-2 lg:max-[1599px]:pt-2 min-[1300px]:max-[1599px]:pt-3 min-[1600px]:pt-4 px-4 md:px-8 lg:px-12 xl:px-[60px]' >
                    {(() => {
                      const titleText = getTranslation(currentLanguage).dashboard.documents;
                      return (
                        <h2 
                          className='text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] mb-0 font-forum'
                        >
                          {titleText}
                        </h2>
                      );
                    })()}
                    {documents.some(doc => doc.pinned) && (() => {
                      const descText = getTranslation(currentLanguage).dashboard.pinnedDocuments;
                      return (
                        <p 
                          className='text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] font-forum font-light text-[#00000080] mb-0'
                        >
                          {descText}
                        </p>
                      );
                    })()}
                  </div>
                  <div className='flex-1 overflow-y-auto'>
                    <DocumentsList documents={documents} currentLanguage={currentLanguage} />
                  </div>
                </div>
                
              </div>
            </>
          )}
        </main>
      </div>
      )}

      {/* Презентация - на всю высоту экрана */}
      {/* {wedding && <Presentation />} */}
    </div>
  );
};

export default ClientDashboard;
