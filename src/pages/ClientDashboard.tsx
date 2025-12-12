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

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ru' | 'ua'>('ru');
  const [isMobile, setIsMobile] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const splashRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  
  // Время перехода в миллисекундах
  const SCROLL_DURATION = 2000;

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

  // Функция плавного скролла с контролируемой длительностью
  const smoothScrollTo = (targetPosition: number, duration: number) => {
    const startPosition = window.pageYOffset || document.documentElement.scrollTop;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      
      // Easing функция для плавности (easeInOutCubic)
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      window.scrollTo(0, startPosition + distance * ease);
      
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      } else {
        // Разблокируем скролл после завершения анимации
        isScrollingRef.current = false;
        document.body.style.overflow = '';
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animation);
  };

  // Обработка скролла для перехода от заглушки к контенту
  useEffect(() => {
    if (!showSplash) return; // Если заглушка уже скрыта, не обрабатываем события

    const handleWheel = (e: WheelEvent) => {
      // Если идет анимация скролла - блокируем все события
      if (isScrollingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (!splashRef.current || !contentRef.current) {
        return;
      }

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      // Проверяем, находимся ли мы на заглушке (скролл вверху страницы)
      const isOnSplash = scrollTop < 50;
      
      // Скролл вниз на заглушке - переходим к контенту
      if (isOnSplash && e.deltaY > 0) {
        e.preventDefault();
        e.stopPropagation();
        isScrollingRef.current = true;
        setIsAnimating(true);
        
        // Блокируем скролл через CSS
        document.body.style.overflow = 'hidden';
        
        // Запускаем анимацию перехода
        const contentTop = contentRef.current.offsetTop;
        smoothScrollTo(contentTop, SCROLL_DURATION);
        
        // После завершения анимации скрываем заглушку
        setTimeout(() => {
          setShowSplash(false);
        }, SCROLL_DURATION);
      }
    };

    // Обработчик для блокировки скролла клавиатурой во время анимации
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isScrollingRef.current && (
        e.key === 'ArrowUp' || 
        e.key === 'ArrowDown' || 
        e.key === 'PageUp' || 
        e.key === 'PageDown' ||
        e.key === 'Home' ||
        e.key === 'End'
      )) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Обработчик для блокировки touch-скролла
    const handleTouchMove = (e: TouchEvent) => {
      if (isScrollingRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchmove', handleTouchMove);
      // Восстанавливаем скролл при размонтировании
      document.body.style.overflow = '';
    };
  }, [showSplash, SCROLL_DURATION]);

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

  // Показываем страницу для мобильных устройств, если экран меньше ноутбучного
  if (isMobile) {
    return (
      <MobileNotSupported 
        coupleName1={wedding?.couple_name_1}
        coupleName2={wedding?.couple_name_2}
      />
    );
  }

  // Показываем только загрузку, если данные еще не загружены
  if (loading && !wedding) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          onLogout={logout}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
        />
        <div className="flex-1 flex items-center justify-center">
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Заглушка - первая секция */}
      {wedding && showSplash && (
        <div 
          ref={splashRef}
          className="relative h-screen w-full flex items-center justify-center"
        >
          <div 
            className={`text-center ease-in-out ${
              isAnimating
                ? 'transform -translate-y-full opacity-0'
                : 'transform translate-y-0 opacity-100'
            }`}
            style={{
              transition: `all ${SCROLL_DURATION}ms ease-in-out`,
            }}
          >
            {/* Имена пары */}
            <h1 
              className="text-[48px] sm:text-[72px] md:text-[100px] lg:text-[100px] max-[1599px]:lg:text-[100px] min-[1600px]:lg:text-[120px] xl:text-[120px] max-[1599px]:xl:text-[120px] min-[1600px]:xl:text-[150px] font-sloop text-black  px-4"
            >
              {wedding?.couple_name_1} <span className='font-sloop'> & </span>  {wedding?.couple_name_2} 
            </h1>
            {/* Приветственный текст */}
            {(() => {
              const splashText = getTranslation(currentLanguage).welcome.splash;
              return (
                <p 
                  className="text-[24px] sm:text-[32px] md:text-[40px] lg:text-[40px] max-[1599px]:lg:text-[40px] min-[1600px]:lg:text-[48px] xl:text-[50px] max-[1599px]:xl:text-[50px] min-[1600px]:xl:text-[60px] text-black px-4"
                  style={getFontStyle(splashText)}
                >
                  {splashText}
                </p>
              );
            })()}
          </div>
        </div>
      )}

      {/* Основной контент - вторая секция */}
      <div 
        ref={contentRef}
        className={`relative min-h-screen flex flex-col`}
        style={{
          opacity: (showSplash && !isAnimating) ? 0 : 1,
          transition: `opacity ${SCROLL_DURATION * 0.5}ms ease-out`, // Контент появляется быстрее (50% от времени заглушки)
        }}
      >
        {/* Header внутри контента - появляется вместе с ним */}
        <Header
          onLogout={logout}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
        />
        <main className="flex-1 flex flex-col">
          {/* Приветствие */}
          <div className="border-b border-[#00000033] py-6 max-[1599px]:py-3 md:max-[1599px]:py-4 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4 px-4 md:px-8 lg:px-12 xl:px-[60px]">
            <h2 
              className="text-[32px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[22px] min-[1300px]:max-[1599px]:text-[26px] font-forum"
            >
              {wedding?.couple_name_1} <span className='font-forum'> & </span> {wedding?.couple_name_2}, {getTranslation(currentLanguage).dashboard.welcome}
            </h2>
            {(() => {
              const descText = getTranslation(currentLanguage).dashboard.viewControl;
              return (
                <p 
                  className="text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] font-forum font-light text-[#00000080]"
                >
                  {descText}
                </p>
              );
            })()}
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
              <div className='border-b border-[#00000033] flex flex-col lg:flex-row pl-4 md:pl-8 lg:pl-12 xl:pl-[60px] shrink-0'>
                <div className='border-r-0 lg:border-r border-[#00000033] border-b lg:border-b-0 py-6 max-[1599px]:py-4 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4 pr-4 max-[1599px]:pr-4 md:max-[1599px]:pr-6 lg:max-[1599px]:pr-8 min-[1300px]:max-[1599px]:pr-10'>
                  {(() => {
                    const titleText = getTranslation(currentLanguage).dashboard.weddingDetails;
                    return (
                      <h2 
                        className='text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] font-forum'
                      >
                        {titleText}
                      </h2>
                    );
                  })()}
                  {(() => {
                    const descText = getTranslation(currentLanguage).dashboard.keyDetails;
                    return (
                      <p 
                        className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[16px] min-[1300px]:max-[1599px]:text-[18px] font-forum font-light text-[#00000080]'
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
                            className='text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080]  font-gilroy font-light'
                            style={getFontStyle(labelText)}
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
                  <div className='py-4 max-[1599px]:py-3 lg:max-[1599px]:py-2 min-[1300px]:max-[1599px]:py-3 pr-4 max-[1599px]:pr-4 md:max-[1599px]:pr-6 lg:max-[1599px]:pr-8 min-[1300px]:max-[1599px]:pr-10'>
                    {(() => {
                      const titleText = getTranslation(currentLanguage).dashboard.tasks;
                      return (
                        <h2 
                          className='text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] mb-3 max-[1599px]:mb-2 lg:max-[1599px]:mb-2 min-[1300px]:max-[1599px]:mb-2 font-forum'
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
                    <TasksList tasks={tasks} />
                  </div>
                </div>

                {/* Документы */}
                <div className='w-full h-full flex flex-col overflow-hidden'>
                  <div className='pt-4 max-[1599px]:pt-3 lg:max-[1599px]:pt-2 min-[1300px]:max-[1599px]:pt-3 px-4 md:px-8 lg:px-12 xl:px-[60px] pb-0' >
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

      {/* Презентация - на всю высоту экрана */}
      {/* {wedding && <Presentation />} */}
    </div>
  );
};

export default ClientDashboard;
