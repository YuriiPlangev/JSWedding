import type { Wedding } from '../types';
import { getTranslation } from '../utils/translations';

interface WelcomeSectionProps {
  wedding: Wedding;
  currentLanguage: 'en' | 'ru' | 'ua';
}

const WelcomeSection = ({ wedding, currentLanguage }: WelcomeSectionProps) => {
  const t = getTranslation(currentLanguage);

  return (
    <div className="border-b border-[#00000033] py-8 sm:py-10 md:py-12 max-[1599px]:py-8 md:max-[1599px]:py-10 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4 px-3 sm:px-4 md:px-8 lg:px-[30px] xl:px-[30px] min-[1500px]:px-[60px]">
      <h2 
        className="text-[18px] sm:text-[22px] md:text-[26px] lg:text-[30px] max-[1599px]:text-[22px] lg:max-[1599px]:text-[20px] min-[1300px]:max-[1599px]:text-[24px] font-forum leading-tight text-center lg:text-left"
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
        className="text-[11px] sm:text-[13px] md:text-[15px] max-[1599px]:text-[13px] lg:max-[1599px]:text-[12px] min-[1300px]:max-[1599px]:text-[13px] font-forum font-light text-[#00000080] leading-tight mt-1 text-center lg:text-left"
      >
        {t.dashboard.viewControl}
      </p>
    </div>
  );
};

export default WelcomeSection;

