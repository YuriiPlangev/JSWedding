import bgImg from '../assets/firstScreen.JPG';
import { getFontStyle } from '../utils/fontUtils';

interface MobileNotSupportedProps {
  coupleName1?: string;
  coupleName2?: string;
}

const MobileNotSupported = ({ coupleName1, coupleName2 }: MobileNotSupportedProps) => {
  // Формируем приветствие с именами
  let greetingText = 'Дорогие';
  if (coupleName1 && coupleName2) {
    greetingText = `Дорогие ${coupleName1} & ${coupleName2}`;
  } else if (coupleName1) {
    greetingText = `Дорогие ${coupleName1}`;
  }
  
  const messageText = `Просим вас открыть сайт с ноутбука, так как мобильная версия ещё в разработке. Нам потребуется совсем немного времени. Благодарим за ваше понимание и терпение 🤍`;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${bgImg})`,
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(1.5px)',
        }}
      />
      
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%)',
        }}
      />
      
      {/* White overlay */}
      <div
        className="absolute inset-0 bg-white opacity-90"
      />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full px-4 md:px-8">
        <div className="text-center max-w-2xl">
          {/* Greeting */}
          <h1
            className="text-[32px] sm:text-[40px] md:text-[48px] mb-6 md:mb-8 text-black"
            style={getFontStyle(greetingText)}
          >
            {greetingText}
          </h1>
          
          {/* Message */}
          <p
            className="text-[18px] sm:text-[20px] md:text-[24px] text-black leading-relaxed"
            style={getFontStyle(messageText)}
          >
            {messageText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileNotSupported;

