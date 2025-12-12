import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { weddingService, taskService, documentService } from '../services/weddingService';
import type { Wedding, Task, Document } from '../types';
import Header from '../components/Header';
import TasksList from '../components/TasksList';
import DocumentsList from '../components/DocumentsList';
// import Presentation from '../components/Presentation';
import placeCircle from '../assets/placeCircle.svg';
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
            {(() => {
              const namesText = `${wedding?.couple_name_1 || ''} & ${wedding?.couple_name_2 || ''}`;
              return (
                <h1 
                  className="text-[48px] sm:text-[72px] md:text-[100px] lg:text-[100px] max-[1599px]:lg:text-[100px] min-[1600px]:lg:text-[120px] xl:text-[120px] max-[1599px]:xl:text-[120px] min-[1600px]:xl:text-[150px] font-lovelace text-black md:mb-6 max-[1599px]:md:mb-5 min-[1600px]:md:mb-6 px-4"
                  style={getFontStyle(namesText)}
                >
                  {wedding?.couple_name_1} & {wedding?.couple_name_2} 
                </h1>
              );
            })()}
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
          <div className="border-b border-[#000000B2] py-6 max-[1599px]:py-3 md:max-[1599px]:py-4 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4 px-4 md:px-8 lg:px-12 xl:px-[60px]">
            {(() => {
              const welcomeText = `${wedding?.couple_name_1} & ${wedding?.couple_name_2} ${getTranslation(currentLanguage).dashboard.welcome}`;
              return (
                <h2 
                  className="text-[32px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[22px] min-[1300px]:max-[1599px]:text-[26px]"
                  style={getFontStyle(welcomeText)}
                >
                  {wedding?.couple_name_1} & {wedding?.couple_name_2}, {getTranslation(currentLanguage).dashboard.welcome}
                </h2>
              );
            })()}
            {(() => {
              const descText = getTranslation(currentLanguage).dashboard.viewControl;
              return (
                <p 
                  className="text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] font-gilroy font-light text-[#4D3628]"
                  style={getFontStyle(descText)}
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
              <div className='border-b border-[#000000B2] flex flex-col lg:flex-row pl-4 md:pl-8 lg:pl-12 xl:pl-[60px] shrink-0'>
                <div className='border-r-0 lg:border-r border-[#00000033] border-b lg:border-b-0 py-6 max-[1599px]:py-4 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4 pr-14 max-[1599px]:pr-0 lg:max-[1599px]:pr-8 min-[1300px]:max-[1599px]:pr-10'>
                  {(() => {
                    const titleText = getTranslation(currentLanguage).dashboard.weddingDetails;
                    return (
                      <h2 
                        className='text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px]'
                        style={getFontStyle(titleText)}
                      >
                        {titleText}
                      </h2>
                    );
                  })()}
                  {(() => {
                    const descText = getTranslation(currentLanguage).dashboard.keyDetails;
                    return (
                      <p 
                        className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[16px] min-[1300px]:max-[1599px]:text-[18px] font-gilroy font-light text-[#00000080]'
                        style={getFontStyle(descText)}
                      >
                        {descText}
                      </p>
                    );
                  })()}
                </div>
                <div className='flex items-center flex-1'>
                  <ul className='flex flex-row flex-wrap lg:flex-nowrap gap-4 max-[1599px]:gap-3 lg:max-[1599px]:gap-3 min-[1300px]:max-[1599px]:gap-4 px-4 md:px-8 lg:px-8 xl:px-[60px] py-6 max-[1599px]:py-4 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4 justify-between lg:justify-between w-full'>
                    <li className='flex flex-col justify-center'>
                      {(() => {
                        const labelText = getTranslation(currentLanguage).dashboard.weddingDate;
                        return (
                          <p 
                            className='text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-gilroy font-light'
                            style={getFontStyle(labelText)}
                          >
                            {labelText}
                          </p>
                        );
                      })()}
                      <p className='text-[32px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[20px] min-[1300px]:max-[1599px]:text-[24px] font-gilroy font-bold'>{formatDate(wedding.wedding_date)}</p>
                    </li>
                    <li className='flex flex-col justify-center'>
                      {(() => {
                        const labelText = getTranslation(currentLanguage).dashboard.venue;
                        return (
                          <p 
                            className='text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-gilroy font-light'
                            style={getFontStyle(labelText)}
                          >
                            {labelText}
                          </p>
                        );
                      })()}
                      <p className='text-[32px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[20px] min-[1300px]:max-[1599px]:text-[24px] font-gilroy font-bold'>{wedding.country}</p>
                    </li>
                    <li className='flex flex-col justify-center'>
                      <div className='flex items-center gap-2'>
                        {(() => {
                          const labelText = getTranslation(currentLanguage).dashboard.celebrationPlace;
                          return (
                            <p 
                              className='text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-gilroy font-light'
                              style={getFontStyle(labelText)}
                            >
                              {labelText}
                            </p>
                          );
                        })()}
                      </div>
                      <p className='text-[32px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[20px] min-[1300px]:max-[1599px]:text-[24px] font-gilroy font-bold '>{wedding.venue}</p>
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
                      <p className='text-[32px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[20px] min-[1300px]:max-[1599px]:text-[24px] font-gilroy font-bold'>{wedding.guest_count}</p>
                    </li>
                    <li className='flex flex-col justify-center'>
                      <p className='text-[32px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[20px] min-[1300px]:max-[1599px]:text-[24px] font-gilroy font-light'>
                        {wedding ? calculateDaysUntilWedding(wedding.wedding_date) : 0} days
                      </p>
                      {(() => {
                        const labelText = getTranslation(currentLanguage).dashboard.daysTillCelebration;
                        return (
                          <p 
                            className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[16px] min-[1300px]:max-[1599px]:text-[18px] font-gilroy font-light'
                            style={getFontStyle(labelText)}
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
                <div className='border-r-0 lg:border-r border-[#000000B2] lg:min-w-3/7 pl-4 md:pl-8 lg:pl-12 xl:pl-[60px] self-stretch overflow-hidden flex flex-col'>
                  <div className='py-4 max-[1599px]:py-3 lg:max-[1599px]:py-2 min-[1300px]:max-[1599px]:py-3'>
                    {(() => {
                      const titleText = getTranslation(currentLanguage).dashboard.tasks;
                      return (
                        <h2 
                          className='text-[44px] max-[1599px]:text-[32px] lg:max-[1599px]:text-[28px] min-[1300px]:max-[1599px]:text-[34px] mb-3 max-[1599px]:mb-2 lg:max-[1599px]:mb-2 min-[1300px]:max-[1599px]:mb-2'
                          style={getFontStyle(titleText)}
                        >
                          {titleText}
                        </h2>
                      );
                    })()}
                    {(() => {
                      const descText = getTranslation(currentLanguage).dashboard.tasksDescription;
                      return (
                        <p 
                          className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[16px] min-[1300px]:max-[1599px]:text-[18px] font-gilroy font-light text-[#00000080]'
                          style={getFontStyle(descText)}
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
                  <div className='pt-4 max-[1599px]:pt-3 lg:max-[1599px]:pt-2 min-[1300px]:max-[1599px]:pt-3 px-4 md:px-8 lg:px-12 xl:px-[60px]' >
                    {(() => {
                      const titleText = getTranslation(currentLanguage).dashboard.documents;
                      return (
                        <h2 
                          className='text-[44px] max-[1599px]:text-[32px] lg:max-[1599px]:text-[28px] min-[1300px]:max-[1599px]:text-[34px] mb-3 max-[1599px]:mb-2 lg:max-[1599px]:mb-2 min-[1300px]:max-[1599px]:mb-2'
                          style={getFontStyle(titleText)}
                        >
                          {titleText}
                        </h2>
                      );
                    })()}
                    {documents.some(doc => doc.pinned) && (() => {
                      const descText = getTranslation(currentLanguage).dashboard.pinnedDocuments;
                      return (
                        <p 
                          className='text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] font-gilroy font-light text-[#00000080]'
                          style={getFontStyle(descText)}
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
