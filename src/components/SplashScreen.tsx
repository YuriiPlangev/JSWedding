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
        {/* Если есть кастомный полный текст, показываем только его */}
        {wedding?.splash_welcome_text_en ? (
          <div>
            <h1 
              className="text-[36px] sm:text-[54px] md:text-[72px] lg:text-[58px] max-[1599px]:lg:text-[58px] min-[1600px]:lg:text-[90px] xl:text-[90px] max-[1599px]:xl:text-[76px] min-[1600px]:xl:text-[117px] font-sloop text-black px-4 leading-[1.1]"
            >
              {wedding.splash_welcome_text_en}
            </h1>
          </div>
        ) : (
          <>
            {/* Имена пары - показываем сохраненные имена сразу, чтобы избежать "прыжка" */}
            {(() => {
              const name1 = wedding?.couple_name_1_en || savedCoupleNames?.name1 || '';
              const name2 = wedding?.couple_name_2_en || savedCoupleNames?.name2 || '';
              const hasName1 = name1.trim() !== '';
              const hasName2 = name2.trim() !== '';
              const hasBothNames = hasName1 && hasName2;
              
              if (!hasName1 && !hasName2) {
                return null;
              }
              
              return (
                <h1 
                  className="text-[36px] sm:text-[54px] md:text-[72px] lg:text-[58px] max-[1599px]:lg:text-[58px] min-[1600px]:lg:text-[90px] xl:text-[90px] max-[1599px]:xl:text-[76px] min-[1600px]:xl:text-[117px] font-sloop text-black px-4 leading-[1.1]"
                >
                  {hasName1 && name1}{hasBothNames && <span className='font-sloop'> & </span>}{hasName2 && name2}
                </h1>
              );
            })()}
            {/* Приветственный текст */}
            <p 
              className="text-[18px] sm:text-[23px] md:text-[28px] lg:text-[23px] max-[1599px]:lg:text-[23px] min-[1600px]:lg:text-[36px] xl:text-[38px] max-[1599px]:xl:text-[30px] min-[1600px]:xl:text-[47px] text-black px-4 leading-[1.2] mt-6 md:mt-8 lg:mt-6 xl:mt-8 font-branch"
            >
              Welcome to your wedding organization space!
            </p>
          </>
        )}
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

