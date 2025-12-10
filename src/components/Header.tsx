import { useState } from 'react';
import logo from '../assets/logoV3.svg';
import notesIcon from '../assets/notes.svg';
import contactIcon from '../assets/tg.svg';
import languageIcon from '../assets/language.svg';

interface HeaderProps {
  onLogout: () => void;
  currentLanguage: 'en' | 'ru' | 'ua';
  onLanguageChange: (lang: 'en' | 'ru' | 'ua') => void;
  bgColor?: string;
}

const Header = ({ onLogout, currentLanguage, onLanguageChange, }: HeaderProps) => {
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  return (
    <header className="w-full bg-[#FBF9F5] border-b border-[#000000B2] relative z-50" >
      <div className="px-15">
        <div className="flex justify-between items-center">
          {/* Left side - Logo and text */}
          <div className="flex items-center gap-3 md:gap-4">
            <img src={logo} alt="logo" className="h-10 md:h-12 w-auto" />
          </div>
          
          {/* Right side - Navigation items */}
          <div className="flex items-center justify-center gap-0">
            {/* Leave your Notes */}
            <button className="flex items-center  gap-2 px-7.5 py-7.5 cursor-pointer border-x border-[#00000033]">
              <img src={notesIcon} alt="notes" className="h-9 w-auto" />
              <span className="hidden md:inline font-gilroy text-[20px] font-light text-[#00000080]">Leave your Notes</span>
            </button>
            
            
            {/* Contact us directly */}
            <button className="flex items-center gap-2 px-7.5 py-7.5 cursor-pointer border-r border-[#00000033] ">
              <img src={contactIcon} alt="contact" className="h-9 w-auto" />
              <span className="hidden md:inline font-gilroy text-[20px] font-light text-[#00000080]">Contact us directly</span>
            </button>
            
            
            {/* Language Switcher */}
            <div className="relative self-stretch flex items-stretch">
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="flex items-center gap-4 px-7 py-7.5 cursor-pointer border-r border-[#00000033] font-gilroy text-[20px] font-light h-full w-full"
              >
                <span className="uppercase text-[#00000080]">{currentLanguage}</span>
                <img src={languageIcon} alt="language" className="h-3 w-4" />
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
                      className={`w-full text-center px-4 py-2 text-[20px] hover:bg-gray-100 transition font-gilroy font-light uppercase cursor-pointer ${
                        currentLanguage === 'en' ? 'bg-gray-50 font-normal' : ''
                      }`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => {
                        onLanguageChange('ua');
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full text-center px-4 py-2 text-[20px] hover:bg-gray-100 transition font-gilroy font-light uppercase cursor-pointer ${
                        currentLanguage === 'ua' ? 'bg-gray-50 font-normal' : ''
                      }`}
                    >
                      UA
                    </button>
                    <button
                      onClick={() => {
                        onLanguageChange('ru');
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full text-center px-4 py-2 text-[20px] hover:bg-gray-100 transition font-gilroy font-light uppercase cursor-pointer ${
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
            <button
              onClick={onLogout}
              className="pl-[64.5px] py-7.5 text-[#00000080] cursor-pointer font-gilroy text-[20px] font-light"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

