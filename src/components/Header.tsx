import { useState, useEffect, useRef } from 'react';
import logo from '../assets/logoV3.svg';
import contactIcon from '../assets/tg.svg';
import languageIcon from '../assets/language.svg';
import notesIcon from '../assets/notes.svg';
import { getTranslation } from '../utils/translations';
import { getFontStyle } from '../utils/fontUtils';
import { weddingService } from '../services/weddingService';

interface HeaderProps {
  onLogout: () => void;
  currentLanguage: 'en' | 'ru' | 'ua';
  onLanguageChange: (lang: 'en' | 'ru' | 'ua') => void;
  bgColor?: string;
  chatLink?: string;
  weddingId?: string; // ID свадьбы для сохранения заметок
  initialNotes?: string; // Начальные заметки из БД
  onNotesChange?: (notes: string) => void; // Callback при изменении заметок
}

const Header = ({ onLogout, currentLanguage, onLanguageChange, chatLink, weddingId, initialNotes = '', onNotesChange }: HeaderProps) => {
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const saveTimeoutRef = useRef<number | null>(null);

  // Обновляем заметки при изменении initialNotes
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  // Сохраняем заметки в БД с задержкой (debounce)
  useEffect(() => {
    if (!weddingId) {
      // Если нет weddingId, сохраняем в localStorage как fallback
      localStorage.setItem('userNotes', notes);
      return;
    }

    // Очищаем предыдущий таймер
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Устанавливаем новый таймер для сохранения через 1 секунду после последнего изменения
    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const success = await weddingService.updateNotes(weddingId, notes);
        if (success && onNotesChange) {
          onNotesChange(notes);
        }
      } catch (error) {
        console.error('Error saving notes:', error);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, weddingId, onNotesChange]);

  // Вариант 1: Блокируем скролл страницы при открытии модального окна
  // useEffect(() => {
  //   if (isNotesModalOpen) {
  //     // Сохраняем текущую позицию скролла
  //     const scrollY = window.scrollY;
  //     // Блокируем скролл
  //     document.body.style.position = 'fixed';
  //     document.body.style.top = `-${scrollY}px`;
  //     document.body.style.width = '100%';
  //     document.body.style.overflow = 'hidden';
  //   } else {
  //     // Восстанавливаем скролл
  //     const scrollY = document.body.style.top;
  //     document.body.style.position = '';
  //     document.body.style.top = '';
  //     document.body.style.width = '';
  //     document.body.style.overflow = '';
  //     if (scrollY) {
  //       window.scrollTo(0, parseInt(scrollY || '0') * -1);
  //     }
  //   }

  //   // Очистка при размонтировании
  //   return () => {
  //     document.body.style.position = '';
  //     document.body.style.top = '';
  //     document.body.style.width = '';
  //     document.body.style.overflow = '';
  //   };
  // }, [isNotesModalOpen]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  // Вариант 1: Закрытие модального окна
  // const handleCloseNotesModal = () => {
  //   setIsNotesModalOpen(false);
  // };

  // Вариант 2: Переключение раскрывающейся области
  const handleToggleNotes = () => {
    setIsNotesModalOpen(!isNotesModalOpen);
  };

  // Закрытие модального окна заметок
  const handleCloseNotes = () => {
    setIsNotesModalOpen(false);
  };

  // Обработчик ESC для закрытия модального окна заметок
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNotesModalOpen) {
        handleCloseNotes();
      }
    };

    if (isNotesModalOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isNotesModalOpen]);

  return (
    <header className="w-full bg-[#eae6db] border-b border-[#00000033] relative z-50" >
      <div className="px-4 md:px-8 lg:px-12 xl:px-[60px]">
        <div className="flex justify-between items-stretch">
          {/* Left side - Logo and text */}
          <div className="flex items-center gap-3 md:gap-4">
            <img 
              src={logo} 
              alt="logo" 
              className="h-8 md:h-10 max-[1599px]:lg:h-9 min-[1600px]:lg:h-12 w-auto"
              style={{ display: 'block' }}
            />
          </div>
          
          {/* Right side - Navigation items */}
          <div className="flex items-center justify-center gap-0">
            {/* Leave your Notes */}
            {(() => {
              const notesText = getTranslation(currentLanguage).header.notes;
              return (
                <div className="relative">
                  <button 
                    onClick={handleToggleNotes}
                    className="flex items-center gap-2 px-4 md:px-6 max-[1599px]:md:px-5 min-[1600px]:md:px-6 lg:px-5 max-[1599px]:lg:px-5 min-[1600px]:lg:px-7.5 py-4 md:py-6 max-[1599px]:md:py-5 min-[1600px]:md:py-6 lg:py-5 max-[1599px]:lg:py-5 min-[1600px]:lg:py-7.5 cursor-pointer border-l border-[#00000033] h-full"
                  >
                    <img src={notesIcon} alt="notes" className="h-5 md:h-6 max-[1599px]:md:h-5 min-[1600px]:md:h-6 lg:h-5 max-[1599px]:lg:h-5 min-[1600px]:lg:h-6 w-auto" />
                    <span 
                      className="hidden lg:inline font-forum text-[24px] max-[1599px]:text-[20px] lg:max-[1599px]:text-[18px] min-[1300px]:max-[1599px]:text-[22px] min-[1600px]:text-[24px] font-light text-[#00000080]"
                      style={getFontStyle(notesText)}
                    >
                      {notesText}
                    </span>
                  </button>
                  
                  {/* Вариант 2: Раскрывающаяся область под кнопкой */}
                  {isNotesModalOpen && (
                    <>
                      {/* Overlay для закрытия по клику вне модального окна */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={handleCloseNotes}
                      />
                      <div 
                        className="absolute left-0 top-full mt-0 w-[400px] max-w-[90vw] bg-[#eae6db] border border-[#00000033] border-t-0 shadow-lg z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-4">
                          <textarea
                            value={notes}
                            onChange={handleNotesChange}
                            placeholder={getTranslation(currentLanguage).header.notesPlaceholder}
                            className="w-full min-h-[200px] p-4 border border-[#00000033] rounded bg-white text-black font-gilroy text-[14px] md:text-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20"
                            style={{ fontFamily: 'inherit' }}
                          />
                          <div className="mt-3 flex justify-end items-center">
                            <button
                              onClick={handleCloseNotes}
                              className="px-4 py-2 text-black font-gilroy text-[14px] md:text-[16px] hover:bg-black hover:text-white transition-colors cursor-pointer"
                            >
                              {getTranslation(currentLanguage).header.close}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            
            
            {/* Contact us directly */}
            {(() => {
              const contactText = getTranslation(currentLanguage).header.contactUs;
              if (chatLink) {
                return (
                  <a 
                    href={chatLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 md:px-6 max-[1599px]:md:px-5 min-[1600px]:md:px-6 lg:px-5 max-[1599px]:lg:px-5 min-[1600px]:lg:px-7.5 py-4 md:py-6 max-[1599px]:md:py-5 min-[1600px]:md:py-6 lg:py-5 max-[1599px]:lg:py-5 min-[1600px]:lg:py-7.5 cursor-pointer border-x border-[#00000033] h-full"
                  >
                    <img src={contactIcon} alt="contact" className="h-5 md:h-6 max-[1599px]:md:h-5 min-[1600px]:md:h-6 lg:h-5 max-[1599px]:lg:h-5 min-[1600px]:lg:h-6 w-auto" />
                    <span 
                      className="hidden lg:inline font-forum text-[24px] max-[1599px]:text-[20px] lg:max-[1599px]:text-[18px] min-[1300px]:max-[1599px]:text-[22px] min-[1600px]:text-[24px] font-light text-[#00000080]"
                      style={getFontStyle(contactText)}
                    >
                      {contactText}
                    </span>
                  </a>
                );
              }
              return (
                <button className="flex items-center gap-2 px-4 md:px-6 max-[1599px]:md:px-5 min-[1600px]:md:px-6 lg:px-5 max-[1599px]:lg:px-5 min-[1600px]:lg:px-7.5 py-4 md:py-6 max-[1599px]:md:py-5 min-[1600px]:md:py-6 lg:py-5 max-[1599px]:lg:py-5 min-[1600px]:lg:py-7.5 cursor-pointer border-x border-[#00000033] h-full">
                  <img src={contactIcon} alt="contact" className="h-5 md:h-6 max-[1599px]:md:h-5 min-[1600px]:md:h-6 lg:h-5 max-[1599px]:lg:h-5 min-[1600px]:lg:h-6 w-auto" />
                  <span 
                    className="hidden lg:inline font-forum text-[24px] max-[1599px]:text-[20px] lg:max-[1599px]:text-[18px] min-[1300px]:max-[1599px]:text-[22px] min-[1600px]:text-[24px] font-light text-[#00000080]"
                    style={getFontStyle(contactText)}
                  >
                    {contactText}
                  </span>
                </button>
              );
            })()}
            
            
            {/* Language Switcher */}
            <div className="relative self-stretch flex items-stretch">
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="flex items-center gap-2 max-[1599px]:lg:gap-3 min-[1600px]:lg:gap-2.5 px-4 md:px-6 max-[1599px]:md:px-5 min-[1600px]:md:px-5 lg:px-5 max-[1599px]:lg:px-5 min-[1600px]:lg:px-5 py-4 md:py-6 max-[1599px]:md:py-5 min-[1600px]:md:py-5 lg:py-5 max-[1599px]:lg:py-5 min-[1600px]:lg:py-5 cursor-pointer border-r border-[#00000033] font-forum text-[28px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[22px] min-[1300px]:max-[1599px]:text-[26px] min-[1600px]:text-[24px] font-light h-full w-full"
                style={{ pointerEvents: 'auto' }}
              >
                <span className="text-[20px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[18px] min-[1300px]:max-[1599px]:text-[20px] min-[1600px]:text-[20px] uppercase text-[#00000080]">{currentLanguage}</span>
                <img src={languageIcon} alt="language" className="h-3 w-4 max-[1599px]:h-2.5 max-[1599px]:w-3.5 min-[1600px]:h-2.5 min-[1600px]:w-3.5" />
              </button>
              
              {isLanguageMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-60"
                    onClick={() => setIsLanguageMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-0 bg-[#eae6db] border border-[#00000033] z-70 overflow-hidden shadow-lg w-full">
                    {currentLanguage !== 'en' && (
                      <button
                        onClick={() => {
                          onLanguageChange('en');
                          setIsLanguageMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 max-[1599px]:lg:gap-3 min-[1600px]:lg:gap-2.5 px-4 md:px-6 max-[1599px]:md:px-5 min-[1600px]:md:px-5 lg:px-5 max-[1599px]:lg:px-5 min-[1600px]:lg:px-5 py-4 md:py-6 max-[1599px]:md:py-5 min-[1600px]:md:py-5 lg:py-5 max-[1599px]:lg:py-5 min-[1600px]:lg:py-5 text-[20px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[18px] min-[1300px]:max-[1599px]:text-[20px] min-[1600px]:text-[20px] font-forum font-light uppercase cursor-pointer text-[#00000080]"
                      >
                        EN
                      </button>
                    )}
                    {currentLanguage !== 'ru' && (
                      <button
                        onClick={() => {
                          onLanguageChange('ru');
                          setIsLanguageMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 max-[1599px]:lg:gap-3 min-[1600px]:lg:gap-2.5 px-4 md:px-6 max-[1599px]:md:px-5 min-[1600px]:md:px-5 lg:px-5 max-[1599px]:lg:px-5 min-[1600px]:lg:px-5 py-4 md:py-6 max-[1599px]:md:py-5 min-[1600px]:md:py-5 lg:py-5 max-[1599px]:lg:py-5 min-[1600px]:lg:py-5 text-[20px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[18px] min-[1300px]:max-[1599px]:text-[20px] min-[1600px]:text-[20px] font-forum font-light uppercase cursor-pointer text-[#00000080]"
                      >
                        RU
                      </button>
                    )}
                    {currentLanguage !== 'ua' && (
                      <button
                        onClick={() => {
                          onLanguageChange('ua');
                          setIsLanguageMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 max-[1599px]:lg:gap-3 min-[1600px]:lg:gap-2.5 px-4 md:px-6 max-[1599px]:md:px-5 min-[1600px]:md:px-5 lg:px-5 max-[1599px]:lg:px-5 min-[1600px]:lg:px-5 py-4 md:py-6 max-[1599px]:md:py-5 min-[1600px]:md:py-5 lg:py-5 max-[1599px]:lg:py-5 min-[1600px]:lg:py-5 text-[20px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[18px] min-[1300px]:max-[1599px]:text-[20px] min-[1600px]:text-[20px] font-forum font-light uppercase cursor-pointer text-[#00000080]"
                      >
                        UA
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            
            
            {/* Logout */}
            {(() => {
              const logoutText = getTranslation(currentLanguage).header.logout;
              return (
                <button
                  onClick={onLogout}
                  className="pl-4 md:pl-8 max-[1599px]:md:pl-6 min-[1600px]:md:pl-8 lg:pl-10 max-[1599px]:lg:pl-10 min-[1600px]:lg:pl-12 xl:pl-[64.5px] max-[1599px]:xl:pl-10 min-[1600px]:xl:pl-[64.5px] py-4 md:py-6 max-[1599px]:md:py-5 min-[1600px]:md:py-6 lg:py-5 max-[1599px]:lg:py-5 min-[1600px]:lg:py-7.5 text-[#00000080] cursor-pointer font-forum text-[24px] max-[1599px]:text-[20px] lg:max-[1599px]:text-[18px] min-[1300px]:max-[1599px]:text-[22px] min-[1600px]:text-[24px] font-light"
                  style={getFontStyle(logoutText)}
                >
                  {logoutText}
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Вариант 3: Боковая панель (Drawer) справа - закомментировано */}
      {/* {isNotesModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-10 z-[100] transition-opacity duration-300"
            onClick={handleToggleNotes}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          />
          <div className="fixed right-0 top-0 h-full w-[450px] max-w-[85vw] bg-[#FBF9F5] shadow-2xl z-[101] transform transition-transform duration-300 ease-out flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-[#00000033]">
              <h2 
                className="font-forum text-[28px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[22px] min-[1300px]:max-[1599px]:text-[26px] min-[1600px]:text-[28px] font-light text-black"
                style={getFontStyle(getTranslation(currentLanguage).header.notesTitle)}
              >
                {getTranslation(currentLanguage).header.notesTitle}
              </h2>
              <button
                onClick={handleToggleNotes}
                className="text-[#00000080] hover:text-black transition-colors text-2xl font-light cursor-pointer"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden p-6">
              <textarea
                value={notes}
                onChange={handleNotesChange}
                placeholder={getTranslation(currentLanguage).header.notesPlaceholder}
                className="w-full h-full min-h-[300px] p-4 border border-[#00000033] rounded bg-white text-black font-gilroy text-[14px] md:text-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20"
                style={{ fontFamily: 'inherit' }}
                autoFocus
              />
            </div>
            
            <div className="p-6 border-t border-[#00000033] flex justify-end">
              <button
                onClick={handleToggleNotes}
                className="px-6 py-2 text-black font-gilroy text-[14px] md:text-[16px] hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                {getTranslation(currentLanguage).header.close}
              </button>
            </div>
          </div>
        </>
      )} */}

      {/* Вариант 1: Notes Modal - закомментировано */}
      {/* {isNotesModalOpen && (
        <>
          <div
            className="modal-backdrop fixed inset-0 bg-black bg-opacity-10 z-[100]"
            onClick={handleCloseNotesModal}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <div 
              className="modal-content bg-[#eae6db] w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-[#00000033]">
                <h2 
                  className="font-forum text-[28px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[22px] min-[1300px]:max-[1599px]:text-[26px] min-[1600px]:text-[28px] font-light text-black"
                  style={getFontStyle(getTranslation(currentLanguage).header.notesTitle)}
                >
                  {getTranslation(currentLanguage).header.notesTitle}
                </h2>
                <button
                  onClick={handleCloseNotesModal}
                  className="text-[#00000080] hover:text-black transition-colors text-2xl font-light cursor-pointer"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden p-6">
                <textarea
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder={getTranslation(currentLanguage).header.notesPlaceholder}
                  className="w-full h-full min-h-[300px] p-4 border border-[#00000033] rounded bg-white text-black font-gilroy text-[14px] md:text-[16px] resize-none focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-20"
                  style={{ fontFamily: 'inherit' }}
                />
              </div>
              
              <div className="p-6 border-t border-[#00000033] flex justify-end">
                <button
                  onClick={handleCloseNotesModal}
                  className="px-6 py-2 text-black font-gilroy text-[14px] md:text-[16px] hover:bg-black hover:text-white transition-colors cursor-pointer"
                >
                  {getTranslation(currentLanguage).header.close}
                </button>
              </div>
            </div>
          </div>
        </>
      )} */}
    </header>
  );
};

export default Header;

