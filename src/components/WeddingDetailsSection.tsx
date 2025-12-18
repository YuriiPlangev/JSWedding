import type { Wedding } from '../types';
import { getTranslation } from '../utils/translations';

interface WeddingDetailsSectionProps {
  wedding: Wedding;
  currentLanguage: 'en' | 'ru' | 'ua';
}

const WeddingDetailsSection = ({ wedding, currentLanguage }: WeddingDetailsSectionProps) => {
  const t = getTranslation(currentLanguage);

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

  const calculateDaysUntilWedding = (weddingDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const wedding = new Date(weddingDate);
    wedding.setHours(0, 0, 0, 0);
    
    const diffTime = wedding.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  const getCountryDisplay = () => {
    if (currentLanguage === 'en' && wedding.country_en) return wedding.country_en;
    if (currentLanguage === 'ru' && wedding.country_ru) return wedding.country_ru;
    if (currentLanguage === 'ua' && wedding.country_ua) return wedding.country_ua;
    return wedding.country || wedding.country_en || wedding.country_ru || wedding.country_ua || '';
  };

  return (
    <div className='border-b border-[#00000033] flex flex-col lg:flex-row pl-3 sm:pl-4 md:pl-8 lg:pl-12 xl:pl-[60px] shrink-0'>
      <div className='border-r-0 lg:border-r border-[#00000033] border-b lg:border-b-0 py-3 sm:py-3 md:py-2 lg:max-[1599px]:py-2 min-[1300px]:max-[1599px]:py-3 min-[1600px]:py-4 pr-3 sm:pr-4 max-[1599px]:pr-4 md:max-[1599px]:pr-6 lg:max-[1599px]:pr-8 min-[1300px]:max-[1599px]:pr-10'>
        <h2 
          className='text-[28px] sm:text-[32px] md:text-[36px] lg:text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] font-forum leading-tight'
        >
          {t.dashboard.weddingDetails}
        </h2>
        <p 
          className='text-[14px] sm:text-[16px] md:text-[18px] lg:text-[24px] -mt-1.5 max-[1599px]:text-[18px] lg:max-[1599px]:text-[16px] min-[1300px]:max-[1599px]:text-[18px] font-forum font-light text-[#00000080] leading-tight mt-[-1]'
        >
          {t.dashboard.keyDetails}
        </p>
      </div>
      <div className='flex items-center flex-1'>
        <ul className='flex flex-row flex-wrap lg:flex-nowrap gap-3 sm:gap-4 max-[1599px]:gap-3 lg:max-[1599px]:gap-3 min-[1300px]:max-[1599px]:gap-4 px-3 sm:px-4 md:px-8 lg:px-8 xl:px-[60px] py-4 sm:py-5 md:py-6 max-[1599px]:py-4 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4 justify-start lg:justify-between w-full'>
          <li className='flex flex-col justify-center min-w-[120px] sm:min-w-[140px]'>
            <p 
              className='text-[12px] sm:text-[14px] md:text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-forum font-light'
            >
              {t.dashboard.weddingDate}
            </p>
            <p className='text-[16px] sm:text-[18px] md:text-[20px] lg:text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold'>{formatDate(wedding.wedding_date)}</p>
          </li>
          <li className='flex flex-col justify-center min-w-[120px] sm:min-w-[140px]'>
            <p 
              className='text-[12px] sm:text-[14px] md:text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-forum font-light'
            >
              {t.dashboard.venue}
            </p>
            <p className='text-[16px] sm:text-[18px] md:text-[20px] lg:text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold'>
              {getCountryDisplay()}
            </p>
          </li>
          <li className='flex flex-col justify-center min-w-[120px] sm:min-w-[140px]'>
            <p 
              className='text-[12px] sm:text-[14px] md:text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-forum font-light'
            >
              {t.dashboard.celebrationPlace}
            </p>
            <p className='text-[16px] sm:text-[18px] md:text-[20px] lg:text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold '>{wedding.venue}</p>
          </li>
          <li className='flex flex-col justify-center min-w-[120px] sm:min-w-[140px]'>
            <p 
              className='text-[12px] sm:text-[14px] md:text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-forum font-light'
            >
              {t.dashboard.numberOfGuests}
            </p>
            <p className='text-[16px] sm:text-[18px] md:text-[20px] lg:text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold'>{wedding.guest_count}</p>
          </li>
          <li className='flex flex-col justify-center min-w-[120px] sm:min-w-[140px]'>
            <p className='text-[16px] sm:text-[18px] md:text-[20px] lg:text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light'>
              {calculateDaysUntilWedding(wedding.wedding_date)} {t.dashboard.days}
            </p>
            <p 
              className='text-[14px] sm:text-[16px] md:text-[18px] lg:text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[16px] min-[1300px]:max-[1599px]:text-[18px] font-forum font-light'
            >
              {t.dashboard.daysTillCelebration}
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default WeddingDetailsSection;

