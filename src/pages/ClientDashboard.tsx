import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { weddingService, taskService, documentService } from '../services/weddingService';
import type { Wedding, Task, Document } from '../types';
import Header from '../components/Header';
import TasksList from '../components/TasksList';
import DocumentsList from '../components/DocumentsList';
import MobileNotSupported from '../components/MobileNotSupported';
import Presentation from '../components/Presentation';
import SplashScreen from '../components/SplashScreen';
import WelcomeSection from '../components/WelcomeSection';
import WeddingDetailsSection from '../components/WeddingDetailsSection';
import { getTranslation } from '../utils/translations';
import { getInitialLanguage } from '../utils/languageUtils';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Загружаем язык из localStorage при инициализации
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ru' | 'ua'>(getInitialLanguage());
  
  // Обработчик изменения языка с сохранением в localStorage
  const handleLanguageChange = (lang: 'en' | 'ru' | 'ua') => {
    setCurrentLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
  };

  const [isMobile, setIsMobile] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashRemoved, setSplashRemoved] = useState(false);
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

  // Скрытие заглушки при прокрутке
  useEffect(() => {
    let hideTimeout: number | null = null;

    const handleScroll = () => {
      if (!splashRef.current || !showSplash || splashRemoved) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const splashHeight = splashRef.current.offsetHeight;
      const windowHeight = window.innerHeight;

      // Заглушка должна скрываться, когда она полностью вышла из видимости
      // (когда scrollTop больше или равен высоте заглушки)
      // В этот момент в верхней части экрана будет виден хедер
      if (scrollTop >= splashHeight) {
        setShowSplash(false);
        // После завершения анимации (800ms) полностью удаляем элемент из DOM
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = window.setTimeout(() => {
          setSplashRemoved(true);
        }, 800);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [showSplash, splashRemoved]);

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
        const splashHeight = splashRef.current?.offsetHeight || 0;
        
        // Если сохраненная позиция находится в области заглушки, не восстанавливаем её
        // (пользователь должен увидеть заглушку при перезагрузке)
        if (savedPosition > 0 && savedPosition > splashHeight) {
          isRestoring = true;
          // Скрываем заглушку, если позиция была после неё
          setShowSplash(false);
          setSplashRemoved(true);
          // Используем несколько попыток для надежности
          const attemptRestore = (attempts = 0) => {
            if (attempts > 10) {
              isRestoring = false;
              return;
            }
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            if (Math.abs(currentScroll - savedPosition) > 10 && savedPosition > splashHeight) {
              window.scrollTo({
                top: savedPosition,
                behavior: 'auto' // Используем auto вместо smooth, чтобы избежать конфликтов
              });
              requestAnimationFrame(() => attemptRestore(attempts + 1));
            } else {
              isRestoring = false;
            }
          };
          // Небольшая задержка перед восстановлением, чтобы заглушка успела скрыться
          setTimeout(() => {
            requestAnimationFrame(() => attemptRestore());
          }, 100);
        }
      }
    };

    // Отслеживаем изменения скролла и предотвращаем нежелательные сбросы
    const handleScroll = () => {
      // Если идет восстановление позиции, не сохраняем и не вмешиваемся
      if (isRestoring) return;
      
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      
      // Сохраняем позицию скролла только если пользователь активно прокручивает
      // (не во время восстановления)
      lastScrollPosition = currentScroll;
      saveScrollPosition();
    };

    // Сохраняем позицию при потере видимости/фокуса
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveScrollPosition();
      }
      // Не восстанавливаем при возврате видимости, чтобы избежать конфликтов
    };

    const handleBlur = () => {
      saveScrollPosition();
    };

    // Восстанавливаем позицию только при монтировании компонента (первая загрузка)
    // Используем useRef для отслеживания, чтобы восстановить только один раз
    const hasRestoredRef = { current: false };
    if (!hasRestoredRef.current) {
      hasRestoredRef.current = true;
      restoreScrollPosition();
    }

    // Подписываемся на события
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // Сохраняем позицию периодически
    const saveInterval = setInterval(saveScrollPosition, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      if (scrollTimeout) window.clearTimeout(scrollTimeout);
      clearInterval(saveInterval);
      saveScrollPosition(); // Сохраняем при размонтировании
    };
  }, []);

  // Проверка размера экрана для мобильных устройств
  useEffect(() => {
    const checkScreenSize = () => {
      // Показываем заглушку только на действительно мобильных устройствах (до 768px)
      setIsMobile(window.innerWidth < 768);
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
        <SplashScreen
          wedding={wedding}
          savedCoupleNames={savedCoupleNames}
          showSplash={showSplash}
          splashRemoved={splashRemoved}
          onSplashRef={(ref) => {
            splashRef.current = ref;
          }}
        />
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
          <WelcomeSection wedding={wedding} currentLanguage={currentLanguage} />

          {/* Ошибка */}
          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-forum">{error}</p>
            </div>
          )}

          {wedding && (
            <>
              {/* Основная информация о свадьбе */}
              <WeddingDetailsSection wedding={wedding} currentLanguage={currentLanguage} />

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
                      currentLanguage={currentLanguage}
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
      {wedding && <Presentation presentation={wedding.presentation} currentLanguage={currentLanguage} />}
    </div>
  );
};

export default ClientDashboard;
