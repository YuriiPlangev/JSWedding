import type { Wedding } from '../types';
import { getTranslation } from '../utils/translations';

interface WelcomeSectionProps {
  wedding: Wedding;
  currentLanguage: 'en' | 'ru' | 'ua';
}

const WelcomeSection = ({ wedding, currentLanguage }: WelcomeSectionProps) => {
  const t = getTranslation(currentLanguage);

  return (
    <div className="border-b border-[#00000033] py-6 max-[1599px]:py-3 md:max-[1599px]:py-4 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4 px-4 md:px-8 lg:px-12 xl:px-[60px]">
      <h2 
        className="text-[32px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[22px] min-[1300px]:max-[1599px]:text-[26px] font-forum leading-tight"
      >
        {(() => {
          // Если есть полный кастомный текст, используем его
          if (wedding?.full_welcome_text_en) {
            return wedding.full_welcome_text_en;
          }
          
          // Иначе составляем из имен и приветственного сообщения
          const name1 = wedding?.couple_name_1_en || '';
          const name2 = wedding?.couple_name_2_en || '';
          const welcomeText = wedding?.welcome_message_en || getTranslation('en').dashboard.welcome;
          
          return (
            <>
              {name1} <span className='font-forum'> & </span> {name2}, {welcomeText}
            </>
          );
        })()}
      </h2>
      <p 
        className="text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] font-forum font-light text-[#00000080] leading-tight mt-1"
      >
        {t.dashboard.viewControl}
      </p>
    </div>
  );
};

export default WelcomeSection;

