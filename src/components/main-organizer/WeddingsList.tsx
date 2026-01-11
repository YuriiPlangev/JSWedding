import type { Wedding } from '../../types';

interface WeddingsListProps {
  weddings: Wedding[];
  onWeddingClick: (weddingId: string) => void;
  onEditWedding: (wedding: Wedding) => void;
  onCreateClient: () => void;
  onCreateWedding: () => void;
}

const WeddingsList = ({ weddings, onWeddingClick, onEditWedding, onCreateClient, onCreateWedding }: WeddingsListProps) => {
  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    
    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    const monthName = monthNames[monthIndex];
    return `${day} ${monthName} ${year}`;
  };

  // Функция для расчета дней до свадьбы
  const calculateDaysUntilWedding = (weddingDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const wedding = new Date(weddingDate);
    wedding.setHours(0, 0, 0, 0);
    
    const diffTime = wedding.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Кнопки над списком ивентов слева сверху */}
      <div className="flex gap-2 mb-4 flex-shrink-0">
        <button
          onClick={onCreateClient}
          className="px-2 py-1.5 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[12px] max-[1599px]:text-[11px] font-forum"
          title="Создать клиента"
        >
          + Клиент
        </button>
        <button
          onClick={onCreateWedding}
          className="px-2 py-1.5 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[12px] max-[1599px]:text-[11px] font-forum"
          title="Добавить ивент"
        >
          + Ивент
        </button>
      </div>

      {weddings.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[...weddings].sort((a, b) => {
              // Сортируем по дате: ближайший ивент первым
              const dateA = a.wedding_date ? new Date(a.wedding_date).getTime() : 0;
              const dateB = b.wedding_date ? new Date(b.wedding_date).getTime() : 0;
              // Если дата отсутствует, помещаем в конец
              if (!dateA && !dateB) return 0;
              if (!dateA) return 1;
              if (!dateB) return -1;
              // Сортируем по возрастанию (ближайший первым)
              return dateA - dateB;
            }).map((wedding) => {
              // Функция для получения страны
              const getCountryDisplay = () => {
                return wedding.country_ru || wedding.country || wedding.country_en || wedding.country_ua || '';
              };

              return (
                <div
                  key={wedding.id}
                  onClick={() => onWeddingClick(wedding.id)}
                  className="bg-white border border-[#00000033] rounded-lg p-3 sm:p-4 hover:shadow-lg transition cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[18px] sm:text-[20px] md:text-[22px] max-[1599px]:text-[20px] font-forum font-bold text-black mb-2 break-words" style={{ fontWeight: 'bold' }}>
                        {wedding.project_name || `${wedding.couple_name_1_ru || wedding.couple_name_1_en || ''} & ${wedding.couple_name_2_ru || wedding.couple_name_2_en || ''}`}
                      </h3>
                      
                      {/* Информация как в деталях свадьбы на странице клиента */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        <div>
                          <p className="text-[12px] sm:text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mb-0.5">
                            Дата свадьбы
                          </p>
                          <p className="text-[16px] sm:text-[18px] max-[1599px]:text-[17px] font-forum font-bold text-black">
                            {formatDate(wedding.wedding_date)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-[12px] sm:text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mb-0.5">
                            Страна
                          </p>
                          <p className="text-[16px] sm:text-[18px] max-[1599px]:text-[17px] font-forum font-bold text-black break-words">
                            {getCountryDisplay()}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-[12px] sm:text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mb-0.5">
                            Место
                          </p>
                          <p className="text-[16px] sm:text-[18px] max-[1599px]:text-[17px] font-forum font-bold text-black break-words">
                            {wedding.venue}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-[12px] sm:text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mb-0.5">
                            Количество гостей
                          </p>
                          <p className="text-[16px] sm:text-[18px] max-[1599px]:text-[17px] font-forum font-bold text-black">
                            {wedding.guest_count}
                          </p>
                        </div>
                        
                        <div className="col-span-2">
                          <p className="text-[16px] sm:text-[18px] max-[1599px]:text-[17px] font-forum font-bold text-black mb-0.5">
                            {calculateDaysUntilWedding(wedding.wedding_date)} дней
                          </p>
                          <p className="text-[12px] sm:text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">
                            до ивента
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditWedding(wedding);
                      }}
                      className="ml-1.5 p-1.5 text-[#00000080] hover:text-black transition-colors cursor-pointer flex-shrink-0"
                      aria-label="Редактировать"
                    >
                      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.333 2.00001C11.5084 1.82475 11.7163 1.68596 11.9447 1.59219C12.1731 1.49843 12.4173 1.45166 12.6637 1.45468C12.9101 1.4577 13.1531 1.51045 13.3787 1.60982C13.6043 1.70919 13.8078 1.85316 13.9773 2.03335C14.1469 2.21354 14.2792 2.42619 14.3668 2.65889C14.4544 2.89159 14.4954 3.13978 14.4873 3.38868C14.4792 3.63758 14.4222 3.88238 14.3197 4.10868C14.2172 4.33498 14.0714 4.53838 13.8913 4.70668L5.528 13.07L2 14L2.93 10.472L11.333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#00000033] rounded-lg p-12 text-center">
          <p className="text-[18px] font-forum font-light text-[#00000080] mb-4">Нет ивентов</p>
          <button
            onClick={onCreateWedding}
            className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
          >
            Создать первый ивент
          </button>
        </div>
      )}
    </div>
  );
};

export default WeddingsList;

