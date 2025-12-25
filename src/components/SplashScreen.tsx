import { useRef, useEffect } from 'react';
import type { Wedding } from '../types';
import scrollDown from '../assets/scroll-down.svg';

interface SplashScreenProps {
  wedding: Wedding | null;
  savedCoupleNames: { name1: string; name2: string } | null;
  showSplash: boolean;
  splashRemoved: boolean;
  onSplashRef: (ref: HTMLDivElement | null) => void;
}

const SplashScreen = ({ wedding, savedCoupleNames, showSplash, splashRemoved, onSplashRef }: SplashScreenProps) => {
  const splashRef = useRef<HTMLDivElement>(null);

  // Передаем ref обратно родителю через useEffect
  useEffect(() => {
    onSplashRef(splashRef.current);
    return () => onSplashRef(null);
  }, [onSplashRef]);

  if (splashRemoved) return null;

  return (
    <div 
      ref={splashRef}
      className="relative h-screen w-full flex items-center justify-center"
      style={{ 
        opacity: showSplash ? 1 : 0,
        pointerEvents: showSplash ? 'auto' : 'none',
        transform: showSplash ? 'translateY(0) scale(1)' : 'translateY(-30px) scale(0.98)',
        height: showSplash ? '100vh' : '0',
        overflow: 'hidden',
        transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'opacity, transform'
      }}
    >
      <div className="text-center -mt-16">
        {/* Имена пары - ВСЕГДА показываем отдельно, НИКОГДА не используем splash_welcome_text_en для h1 */}
        {(() => {
          // ВАЖНО: Берем имена ТОЛЬКО из couple_name_1_en и couple_name_2_en
          // НИКОГДА не используем splash_welcome_text_en для h1, даже если имена пустые
          // Поддерживаем случай с одним именем (корпоратив)
          
          // Явно берем имена ТОЛЬКО из этих полей, игнорируя splash_welcome_text_en
          // ВАЖНО: Приоритет wedding данных над savedCoupleNames
          // Это гарантирует, что мы используем актуальные данные из базы, а не старые из localStorage
          // ЯВНО проверяем, что мы НЕ используем splash_welcome_text_en
          const name1Raw = wedding?.couple_name_1_en || savedCoupleNames?.name1 || '';
          const name2Raw = wedding?.couple_name_2_en || savedCoupleNames?.name2 || '';
          const name1 = name1Raw.trim();
          const name2 = name2Raw.trim();
          
          // КРИТИЧЕСКАЯ ПРОВЕРКА: убеждаемся, что name1 НЕ равен splash_welcome_text_en
          // Если они равны, значит где-то произошла ошибка, и мы должны использовать пустую строку
          if (name1 === wedding?.splash_welcome_text_en?.trim()) {
            // Используем пустую строку вместо неправильного значения
            const correctedName1 = '';
            const correctedName2 = name2;
            
            if (!correctedName1 && !correctedName2) {
              return null;
            }
            
            return (
              <h1 
                key="couple-names-h1"
                className="text-[36px] sm:text-[54px] md:text-[72px] lg:text-[58px] max-[1599px]:lg:text-[58px] min-[1600px]:lg:text-[90px] xl:text-[90px] max-[1599px]:xl:text-[76px] min-[1600px]:xl:text-[117px] font-sloop text-black px-4 leading-[1.1]"
              >
                {correctedName1}
                {correctedName1 && correctedName2 && <span className='font-sloop'> & </span>}
                {correctedName2}
              </h1>
            );
          }
          
          const hasName1 = name1 !== '';
          const hasName2 = name2 !== '';
          
          // Если имен нет, не показываем h1 вообще (не используем splash_welcome_text_en как fallback)
          if (!hasName1 && !hasName2) {
            return null;
          }
          
          // ВАЖНО: h1 содержит ТОЛЬКО имена из couple_name_1_en и couple_name_2_en
          // НИКОГДА не используем splash_welcome_text_en для h1
          // Поддерживаем случай с одним именем (корпоратив) - показываем только name1
          
          return (
            <h1 
              key="couple-names-h1"
              className="text-[36px] sm:text-[54px] md:text-[72px] lg:text-[58px] max-[1599px]:lg:text-[58px] min-[1600px]:lg:text-[90px] xl:text-[90px] max-[1599px]:xl:text-[76px] min-[1600px]:xl:text-[117px] font-sloop text-black px-4 leading-[1.1]"
            >
              {hasName1 && name1}
              {hasName1 && hasName2 && <span className='font-sloop'> & </span>}
              {hasName2 && name2}
            </h1>
          );
        })()}
        {/* Приветственный текст - используем ТОЛЬКО splash_welcome_text_en для нижнего текста, НЕ для имен */}
        <p 
          key="splash-welcome-text-p"
          className="text-[18px] sm:text-[23px] md:text-[28px] lg:text-[23px] max-[1599px]:lg:text-[23px] min-[1600px]:lg:text-[36px] xl:text-[38px] max-[1599px]:xl:text-[30px] min-[1600px]:xl:text-[47px] text-black px-4 leading-[1.2] mt-6 md:mt-8 lg:mt-6 xl:mt-8 font-branch"
        >
          {wedding?.splash_welcome_text_en || 'Welcome to your event organization space!'}
        </p>
      </div>
      
      {/* Scroll down indicator */}
      <div className="absolute bottom-4 lg:bottom-4 max-[1599px]:lg:bottom-4 min-[1600px]:xl:bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex flex-col items-center">
        <img src={scrollDown} alt="scrollDown" className='brightness-0 w-8 h-8 md:w-10 md:h-10 lg:w-8 lg:h-8 xl:w-10 xl:h-10' />
        <p className='mt-2 text-black font-gilroy text-sm md:text-base lg:text-sm xl:text-base'>Scroll down to continue</p>
      </div>
    </div>
  );
};

export default SplashScreen;

