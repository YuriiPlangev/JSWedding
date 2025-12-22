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
    <div className='border-b border-[#00000033] flex flex-col lg:flex-row pl-0 sm:pl-0 md:pl-8 md:max-lg:pl-0 lg:pl-12 xl:pl-[60px] shrink-0'>
      <div className='border-r-0 lg:border-r border-[#00000033] border-b lg:border-b-0 py-8 sm:py-10 md:py-8 md:max-lg:py-6 lg:py-12 max-[1599px]:py-8 md:max-[1599px]:py-10 lg:max-[1599px]:py-2 min-[1300px]:max-[1599px]:py-3 min-[1600px]:py-4 px-3 sm:px-4 pr-3 sm:pr-4 max-[1599px]:pr-4 md:max-[1599px]:pr-6 lg:max-[1599px]:pr-8 min-[1300px]:max-[1599px]:pr-10'>
        <h2 
          className='text-[26px] sm:text-[30px] md:text-[28px] md:max-lg:text-[24px] lg:text-[48px] max-[1599px]:text-[34px] lg:max-[1599px]:text-[30px] min-[1300px]:max-[1599px]:text-[36px] font-forum leading-tight text-center lg:text-left'
        >
          {t.dashboard.weddingDetails}
        </h2>
        <p 
          className='text-[13px] sm:text-[15px] md:text-[14px] md:max-lg:text-[12px] lg:text-[22px] max-[1599px]:text-[17px] lg:max-[1599px]:text-[15px] min-[1300px]:max-[1599px]:text-[17px] font-forum font-light text-[#00000080] leading-tight mt-1 text-center lg:text-left'
        >
          {t.dashboard.keyDetails}
        </p>
      </div>
      <div className='flex items-start lg:items-center flex-1'>
        <div className='w-full pl-0 pr-1 sm:pr-2 md:pl-8 md:pr-8 md:max-lg:pl-0 md:max-lg:pr-0 md:max-lg:flex md:max-lg:justify-center lg:px-8 xl:px-[60px] py-8 sm:py-10 md:py-8 md:max-lg:py-6 lg:py-2 max-[1599px]:lg:py-2 min-[1300px]:max-[1599px]:lg:py-3 min-[1600px]:lg:py-4'>
          {/* Мобильная версия: Все элементы в одну колонку */}
          <div className='lg:hidden'>
            <div className='w-full'>
              <div className='flex flex-col items-center gap-4 sm:gap-5 md:gap-6'>
                {/* Дата свадьбы */}
                <div className='flex flex-col items-center text-center'>
                  <p 
                    className='text-[12px] sm:text-[14px] md:text-[16px] text-[#00000080] font-forum font-light mb-1 sm:mb-1.5'
                  >
                    {t.dashboard.weddingDate}
                  </p>
                  <p className='text-[16px] sm:text-[18px] md:text-[20px] font-forum font-bold leading-tight'>{formatDate(wedding.wedding_date)}</p>
                </div>
                
                {/* Локация */}
                <div className='flex flex-col items-center text-center'>
                  <p 
                    className='text-[12px] sm:text-[14px] md:text-[16px] text-[#00000080] font-forum font-light mb-1 sm:mb-1.5'
                  >
                    {t.dashboard.celebrationPlace}
                  </p>
                  <p className='text-[16px] sm:text-[18px] md:text-[20px] font-forum font-bold leading-tight break-words'>{wedding.venue}</p>
                </div>
                
                {/* Страна */}
                <div className='flex flex-col items-center text-center'>
                  <p 
                    className='text-[12px] sm:text-[14px] md:text-[16px] text-[#00000080] font-forum font-light mb-1 sm:mb-1.5'
                  >
                    {t.dashboard.venue}
                  </p>
                  <p className='text-[16px] sm:text-[18px] md:text-[20px] font-forum font-bold leading-tight break-words'>
                    {getCountryDisplay()}
                  </p>
                </div>
                
                {/* Количество гостей */}
                <div className='flex flex-col items-center text-center'>
                  <p 
                    className='text-[12px] sm:text-[14px] md:text-[16px] text-[#00000080] font-forum font-light mb-1 sm:mb-1.5'
                  >
                    {t.dashboard.numberOfGuests}
                  </p>
                  <p className='text-[16px] sm:text-[18px] md:text-[20px] font-forum font-bold leading-tight'>{wedding.guest_count}</p>
                </div>
                
                {/* Дни до свадьбы */}
                <div className='flex flex-col items-center text-center'>
                  <p className='text-[16px] sm:text-[18px] md:text-[20px] font-forum font-bold leading-tight mb-1 sm:mb-1.5'>
                    {calculateDaysUntilWedding(wedding.wedding_date)} {t.dashboard.days}
                  </p>
                  <p 
                    className='text-[12px] sm:text-[14px] md:text-[16px] font-forum font-light text-[#00000080] leading-tight'
                  >
                    {t.dashboard.daysTillCelebration}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Десктопная версия: как было раньше - 4 элемента в ряд */}
          <div className='hidden lg:block md:max-lg:flex md:max-lg:justify-center'>
            <ul className='grid grid-cols-5 gap-x-4 sm:gap-x-6 md:gap-x-6 md:max-lg:gap-x-4 lg:gap-x-8 gap-y-4 sm:gap-y-5 md:gap-y-4 md:max-lg:gap-y-3 lg:gap-y-6 md:max-lg:mx-auto'>
              <li className='flex flex-col justify-start items-center text-center'>
                <p 
                  className='text-[12px] sm:text-[14px] md:text-[13px] md:max-lg:text-[11px] lg:text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-forum font-light mb-1 sm:mb-1.5'
                >
                  {t.dashboard.weddingDate}
                </p>
                <p className='text-[16px] sm:text-[18px] md:text-[16px] md:max-lg:text-[14px] lg:text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold leading-tight'>{formatDate(wedding.wedding_date)}</p>
              </li>
              <li className='flex flex-col justify-start items-center text-center'>
                <p 
                  className='text-[12px] sm:text-[14px] md:text-[13px] md:max-lg:text-[11px] lg:text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-forum font-light mb-1 sm:mb-1.5'
                >
                  {t.dashboard.venue}
                </p>
                <p className='text-[16px] sm:text-[18px] md:text-[16px] md:max-lg:text-[14px] lg:text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold leading-tight break-words'>
                  {getCountryDisplay()}
                </p>
              </li>
              <li className='flex flex-col justify-start items-center text-center'>
                <p 
                  className='text-[12px] sm:text-[14px] md:text-[13px] md:max-lg:text-[11px] lg:text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-forum font-light mb-1 sm:mb-1.5'
                >
                  {t.dashboard.celebrationPlace}
                </p>
                <p className='text-[16px] sm:text-[18px] md:text-[16px] md:max-lg:text-[14px] lg:text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold leading-tight break-words'>{wedding.venue}</p>
              </li>
              <li className='flex flex-col justify-start items-center text-center'>
                <p 
                  className='text-[12px] sm:text-[14px] md:text-[13px] md:max-lg:text-[11px] lg:text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] text-[#00000080] font-forum font-light mb-1 sm:mb-1.5'
                >
                  {t.dashboard.numberOfGuests}
                </p>
                <p className='text-[16px] sm:text-[18px] md:text-[16px] md:max-lg:text-[14px] lg:text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold leading-tight'>{wedding.guest_count}</p>
              </li>
              <li className='flex flex-col justify-start items-center text-center'>
                <p className='text-[16px] sm:text-[18px] md:text-[16px] md:max-lg:text-[14px] lg:text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-bold leading-tight mb-1 sm:mb-1.5'>
                  {calculateDaysUntilWedding(wedding.wedding_date)} {t.dashboard.days}
                </p>
                <p 
                  className='text-[12px] sm:text-[14px] md:text-[13px] md:max-lg:text-[11px] lg:text-[18px] max-[1599px]:text-[16px] lg:max-[1599px]:text-[14px] min-[1300px]:max-[1599px]:text-[16px] font-forum font-light text-[#00000080] leading-tight'
                >
                  {t.dashboard.daysTillCelebration}
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeddingDetailsSection;

