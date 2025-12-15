import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { weddingService, taskService, documentService } from '../services/weddingService';
import type { Wedding, Task, Document } from '../types';
import Header from '../components/Header';
import TasksList from '../components/TasksList';
import DocumentsList from '../components/DocumentsList';
import MobileNotSupported from '../components/MobileNotSupported';
import Presentation from '../components/Presentation';
import { getTranslation } from '../utils/translations';
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
  const dataLoadedRef = useRef<string | null>(null); // Отслеживаем, для какого user уже загружены данные
  const isLoadingRef = useRef(false); // Предотвращаем параллельные загрузки

  // Сохраняем имена пары для предотвращения "прыжка" при загрузке
  const getSavedCoupleNames = (): { name1: string; name2: string } | null => {
    try {
      const saved = localStorage.getItem('couple_names');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name1 && parsed.name2) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error reading saved couple names:', error);
    }
    return null;
  };

  const [savedCoupleNames, setSavedCoupleNames] = useState<{ name1: string; name2: string } | null>(getSavedCoupleNames());

  // Защита от сброса скролла при возврате на страницу
  useEffect(() => {
    const SCROLL_KEY = 'clientDashboard_scrollPosition';
    let lastScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    let isRestoring = false;
    let scrollTimeout: number | null = null;

    // Сохраняем позицию скролла в sessionStorage
    const saveScrollPosition = () => {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      if (currentScroll > 0) {
        sessionStorage.setItem(SCROLL_KEY, currentScroll.toString());
        lastScrollPosition = currentScroll;
      }
    };

    // Восстанавливаем позицию скролла
    const restoreScrollPosition = () => {
      const saved = sessionStorage.getItem(SCROLL_KEY);
      if (saved) {
        const savedPosition = parseInt(saved, 10);
        if (savedPosition > 0) {
          isRestoring = true;
          // Используем несколько попыток для надежности
          const attemptRestore = (attempts = 0) => {
            if (attempts > 10) {
              isRestoring = false;
              return;
            }
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            if (currentScroll !== savedPosition && savedPosition > 100) {
              window.scrollTo(0, savedPosition);
              requestAnimationFrame(() => attemptRestore(attempts + 1));
            } else {
              isRestoring = false;
            }
          };
          requestAnimationFrame(() => attemptRestore());
        }
      }
    };

    // Отслеживаем изменения скролла и предотвращаем нежелательные сбросы
    const handleScroll = () => {
      if (isRestoring) return;
      
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      
      // Если скролл внезапно стал 0 без явного действия пользователя, восстанавливаем
      if (currentScroll === 0 && lastScrollPosition > 100) {
        const saved = sessionStorage.getItem(SCROLL_KEY);
        if (saved) {
          const savedPosition = parseInt(saved, 10);
          if (savedPosition > 0) {
            // Небольшая задержка, чтобы убедиться, что это не намеренный скролл
            if (scrollTimeout) window.clearTimeout(scrollTimeout);
            scrollTimeout = window.setTimeout(() => {
              const newScroll = window.pageYOffset || document.documentElement.scrollTop;
              if (newScroll === 0 && savedPosition > 100) {
                window.scrollTo(0, savedPosition);
              }
            }, 100);
          }
        }
      } else {
        lastScrollPosition = currentScroll;
        saveScrollPosition();
      }
    };

    // Сохраняем позицию при потере видимости/фокуса
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveScrollPosition();
      } else {
        // Восстанавливаем при возврате видимости
        setTimeout(() => {
          restoreScrollPosition();
        }, 50);
      }
    };

    const handleBlur = () => {
      saveScrollPosition();
    };

    const handleFocus = () => {
      setTimeout(() => {
        restoreScrollPosition();
      }, 50);
    };

    // Восстанавливаем позицию при монтировании компонента
    restoreScrollPosition();

    // Подписываемся на события
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // Сохраняем позицию периодически
    const saveInterval = setInterval(saveScrollPosition, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (scrollTimeout) window.clearTimeout(scrollTimeout);
      clearInterval(saveInterval);
      saveScrollPosition(); // Сохраняем при размонтировании
    };
  }, []);

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

  const loadWeddingData = useCallback(async (forceRefresh: boolean = false) => {
    if (!user?.id) return;
    
    // Если данные уже загружены для этого user и не требуется принудительное обновление, пропускаем
    if (!forceRefresh && dataLoadedRef.current === user.id && wedding) {
      return;
    }
    
    // Предотвращаем параллельные загрузки
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    
    // Устанавливаем loading только если данных еще нет
    if (!wedding) {
      setLoading(true);
    }
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

      // Сохраняем имена пары в localStorage для предотвращения "прыжка" при перезагрузке
      if (weddingData.couple_name_1_en && weddingData.couple_name_2_en) {
        const coupleNames = {
          name1: weddingData.couple_name_1_en,
          name2: weddingData.couple_name_2_en,
        };
        localStorage.setItem('couple_names', JSON.stringify(coupleNames));
        setSavedCoupleNames(coupleNames);
      }

      // Загружаем задания (используем кеш, если не принудительное обновление)
      const tasksData = await taskService.getWeddingTasks(weddingData.id, !forceRefresh);
      setTasks(tasksData);

      // Загружаем документы (используем кеш, если не принудительное обновление)
      const documentsData = await documentService.getWeddingDocuments(weddingData.id, !forceRefresh);
      setDocuments(documentsData);
      
      // Отмечаем, что данные загружены для этого user
      dataLoadedRef.current = user.id;
    } catch (err) {
      console.error('Error loading wedding data:', err);
      setError('Ошибка при загрузке данных. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [user?.id, wedding]);

  useEffect(() => {
    // Загружаем данные только если:
    // 1. Есть user.id
    // 2. Данные еще не загружены для этого user
    // 3. Не идет уже загрузка
    if (user?.id && dataLoadedRef.current !== user.id && !isLoadingRef.current) {
      loadWeddingData();
    }
  }, [user?.id, loadWeddingData]); // Используем user?.id вместо user, чтобы избежать лишних перезагрузок


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
    
    const previousStatus = tasks.find(t => t.id === taskId)?.status || 'pending';
    
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
      const updatedTask = await taskService.updateTask(taskId, { 
        status: completed ? 'completed' : 'pending' 
      }, wedding.id);
      
      // Обновляем задачу с актуальными данными с сервера (включая updated_at)
      if (updatedTask) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? updatedTask : task
          )
        );
      }
    } catch (error) {
      console.error('Error updating task:', error);
      // В случае ошибки возвращаем предыдущее состояние
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: previousStatus }
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
        coupleName1={wedding?.couple_name_1_en}
        coupleName2={wedding?.couple_name_2_en}
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
            {/* Имена пары - показываем сохраненные имена сразу, чтобы избежать "прыжка" */}
            {(wedding || savedCoupleNames) && (
              <h1 
                className="text-[36px] sm:text-[54px] md:text-[72px] lg:text-[58px] max-[1599px]:lg:text-[58px] min-[1600px]:lg:text-[90px] xl:text-[90px] max-[1599px]:xl:text-[76px] min-[1600px]:xl:text-[117px] font-sloop text-black px-4 leading-[1.1]"
              >
                {(wedding?.couple_name_1_en || savedCoupleNames?.name1 || '')} <span className='font-sloop'> & </span>  {(wedding?.couple_name_2_en || savedCoupleNames?.name2 || '')} 
              </h1>
            )}
            {/* Приветственный текст */}
            <p 
              className="text-[18px] sm:text-[23px] md:text-[28px] lg:text-[23px] max-[1599px]:lg:text-[23px] min-[1600px]:lg:text-[36px] xl:text-[38px] max-[1599px]:xl:text-[30px] min-[1600px]:xl:text-[47px] text-black px-4 leading-[1.2] mt-6 md:mt-8 lg:mt-6 xl:mt-8 font-branch"
            >
              Welcome to your wedding organization space!
            </p>
          </div>
          
          {/* Scroll down indicator */}
          <div className="absolute bottom-4 lg:bottom-4 max-[1599px]:lg:bottom-4 min-[1600px]:xl:bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center">
            <img src={scrollDown} alt="scrollDown" className='brightness-0 w-8 h-8 md:w-10 md:h-10 lg:w-8 lg:h-8 xl:w-10 xl:h-10' />
            <p className='mt-2 text-black font-gilroy text-sm md:text-base lg:text-sm xl:text-base'>Scroll down to continue</p>
          </div>
        </div>
      )}

      {/* Основной контент - вторая секция */}
      {wedding && !loading && (
      <div className="relative h-screen flex flex-col overflow-hidden">
        {/* Header внутри контента - появляется вместе с ним */}
        <Header
          onLogout={logout}
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          chatLink={wedding?.chat_link}
          weddingId={wedding?.id}
          initialNotes={wedding?.notes || ''}
          onNotesChange={(newNotes) => {
            // Обновляем локальное состояние свадьбы
            if (wedding) {
              setWedding({ ...wedding, notes: newNotes });
            }
          }}
        />
        <main className="flex-1 flex flex-col font-forum min-h-0 mb-4">
          {/* Приветствие */}
          <div className="border-b border-[#00000033] py-6 max-[1599px]:py-3 md:max-[1599px]:py-4 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4 px-4 md:px-8 lg:px-12 xl:px-[60px]">
            <h2 
              className="text-[32px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[22px] min-[1300px]:max-[1599px]:text-[26px] font-forum leading-tight"
            >
              {(() => {
                const name1 = currentLanguage === 'ru' 
                  ? wedding?.couple_name_1_ru
                  : wedding?.couple_name_1_en;
                const name2 = currentLanguage === 'ru'
                  ? wedding?.couple_name_2_ru
                  : wedding?.couple_name_2_en;
                return (
                  <>
                    {name1} <span className='font-forum'> & </span> {name2}, {getTranslation(currentLanguage).dashboard.welcome}
                  </>
                );
              })()}
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
                        className='text-[24px] -mt-1.5 max-[1599px]:text-[18px] lg:max-[1599px]:text-[16px] min-[1300px]:max-[1599px]:text-[18px] font-forum font-light text-[#00000080] leading-tight mt-[-1]'
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

              <div className="flex flex-col lg:flex-row border-b border-[#00000033] flex-1 min-h-0">
                {/* Задания */}
                <div className='border-r-0 lg:border-r border-[#00000033] lg:min-w-3/7 pl-4 md:pl-8 lg:pl-12 xl:pl-[60px] self-stretch overflow-hidden flex flex-col'>
                  <div className='py-2 lg:max-[1599px]:py-2 min-[1300px]:max-[1599px]:py-3 min-[1600px]:py-4 pr-4 max-[1599px]:pr-4 md:max-[1599px]:pr-6 lg:max-[1599px]:pr-8 min-[1300px]:max-[1599px]:pr-10'>
                    {(() => {
                      const titleText = getTranslation(currentLanguage).dashboard.tasks;
                      return (
                        <h2 
                          className='text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] mb-1 font-forum'
                        >
                          {titleText}
                        </h2>
                      );
                    })()}
                    {(() => {
                      const descText = getTranslation(currentLanguage).dashboard.tasksDescription;
                      return (
                        <p 
                          className='text-[24px] max-[1599px]:text-[18px] -mt-2 lg:max-[1599px]:text-[16px] min-[1300px]:max-[1599px]:text-[18px] font-forum font-light text-[#00000080]'
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
                <div className='w-full flex flex-col min-h-0'>
                  <div className='pt-2 lg:max-[1599px]:pt-2 min-[1300px]:max-[1599px]:pt-3 min-[1600px]:pt-4 px-4 md:px-8 lg:px-12 xl:px-[60px] shrink-0'>
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
                  </div>
                  <div className='flex-1 min-h-0 overflow-hidden'>
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
      {wedding && <Presentation />}
    </div>
  );
};

export default ClientDashboard;
