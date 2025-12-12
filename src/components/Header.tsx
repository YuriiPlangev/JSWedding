import { useState } from 'react';
import logo from '../assets/logoV3.svg';
import contactIcon from '../assets/tg.svg';
import languageIcon from '../assets/language.svg';
import { getTranslation } from '../utils/translations';
import { getFontStyle } from '../utils/fontUtils';

interface HeaderProps {
  onLogout: () => void;
  currentLanguage: 'en' | 'ru' | 'ua';
  onLanguageChange: (lang: 'en' | 'ru' | 'ua') => void;
  bgColor?: string;
}

const Header = ({ onLogout, currentLanguage, onLanguageChange, }: HeaderProps) => {
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  return (
    <header className="w-full bg-[#FBF9F5] border-b border-[#00000033] relative z-50" >
      <div className="px-4 md:px-8 lg:px-12 xl:px-[60px]">
        <div className="flex justify-between items-center">
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
            {/* <button className="flex items-center gap-2 px-4 md:px-6 lg:px-7.5 py-4 md:py-6 lg:py-7.5 cursor-pointer border-x border-[#00000033]">
              <img src={notesIcon} alt="notes" className="h-7 md:h-8 lg:h-9 w-auto" />
              <span className="hidden lg:inline font-gilroy text-[18px] lg:text-[19px] xl:text-[20px] font-light text-[#00000080]">Leave your Notes</span>
            </button> */}
            
            
            {/* Contact us directly */}
            {(() => {
              const contactText = getTranslation(currentLanguage).header.contactUs;
              return (
                <button className="flex items-center gap-2 px-4 md:px-6 max-[1599px]:md:px-5 min-[1600px]:md:px-6 lg:px-5 max-[1599px]:lg:px-5 min-[1600px]:lg:px-7.5 py-4 md:py-6 max-[1599px]:md:py-5 min-[1600px]:md:py-6 lg:py-5 max-[1599px]:lg:py-5 min-[1600px]:lg:py-7.5 cursor-pointer border-x border-[#00000033] ">
                  <img src={contactIcon} alt="contact" className="h-7 md:h-8 max-[1599px]:md:h-7 min-[1600px]:md:h-8 lg:h-7 max-[1599px]:lg:h-7 min-[1600px]:lg:h-9 w-auto" />
                  <span 
                    className="hidden lg:inline font-gilroy text-[16px] max-[1599px]:lg:text-[17px] min-[1600px]:lg:text-[19px] xl:text-[20px] max-[1599px]:xl:text-[17px] min-[1600px]:xl:text-[20px] font-light text-[#00000080]"
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
                className="flex items-center gap-2 max-[1599px]:lg:gap-3 min-[1600px]:lg:gap-4 px-4 md:px-6 max-[1599px]:md:px-5 min-[1600px]:md:px-6 lg:px-5 max-[1599px]:lg:px-5 min-[1600px]:lg:px-7 py-4 md:py-6 max-[1599px]:md:py-5 min-[1600px]:md:py-6 lg:py-5 max-[1599px]:lg:py-5 min-[1600px]:lg:py-7.5 cursor-pointer border-r border-[#00000033] font-gilroy text-[16px] max-[1599px]:lg:text-[17px] min-[1600px]:lg:text-[19px] xl:text-[20px] max-[1599px]:xl:text-[17px] min-[1600px]:xl:text-[20px] font-light h-full w-full"
              >
                <span className="uppercase text-[#00000080]">{currentLanguage}</span>
                <img src={languageIcon} alt="language" className="h-3 w-4 max-[1599px]:h-2.5 max-[1599px]:w-3.5 min-[1600px]:h-3 min-[1600px]:w-4" />
              </button>
              
              {isLanguageMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-60"
                    onClick={() => setIsLanguageMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-0 bg-white border border-[#00000033] z-70 overflow-hidden shadow-lg">
                    <button
                      onClick={() => {
                        onLanguageChange('en');
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full text-center px-4 py-2 text-[16px] max-[1599px]:lg:text-[17px] min-[1600px]:lg:text-[19px] xl:text-[20px] max-[1599px]:xl:text-[17px] min-[1600px]:xl:text-[20px] hover:bg-gray-100 transition font-gilroy font-light uppercase cursor-pointer ${
                        currentLanguage === 'en' ? 'bg-gray-50 font-normal' : ''
                      }`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => {
                        onLanguageChange('ru');
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full text-center px-4 py-2 text-[16px] max-[1599px]:lg:text-[17px] min-[1600px]:lg:text-[19px] xl:text-[20px] max-[1599px]:xl:text-[17px] min-[1600px]:xl:text-[20px] hover:bg-gray-100 transition font-gilroy font-light uppercase cursor-pointer ${
                        currentLanguage === 'ru' ? 'bg-gray-50 font-normal' : ''
                      }`}
                    >
                      RU
                    </button>
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
                  className="pl-4 md:pl-8 max-[1599px]:md:pl-6 min-[1600px]:md:pl-8 lg:pl-10 max-[1599px]:lg:pl-10 min-[1600px]:lg:pl-12 xl:pl-[64.5px] max-[1599px]:xl:pl-10 min-[1600px]:xl:pl-[64.5px] py-4 md:py-6 max-[1599px]:md:py-5 min-[1600px]:md:py-6 lg:py-5 max-[1599px]:lg:py-5 min-[1600px]:lg:py-7.5 text-[#00000080] cursor-pointer font-gilroy text-[16px] max-[1599px]:lg:text-[17px] min-[1600px]:lg:text-[19px] xl:text-[20px] max-[1599px]:xl:text-[17px] min-[1600px]:xl:text-[20px] font-light"
                  style={getFontStyle(logoutText)}
                >
                  {logoutText}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

