import { useState, useMemo } from 'react';
import type { Wedding } from '../types';

interface ProjectsCalendarProps {
  weddings: Wedding[];
  onDateClick?: (weddingId: string) => void;
}

const ProjectsCalendar = ({ weddings, onDateClick }: ProjectsCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Получаем даты проектов
  const projectDates = useMemo(() => {
    const dates = new Map<string, Wedding[]>();
    weddings.forEach(wedding => {
      const dateKey = new Date(wedding.wedding_date).toDateString();
      if (!dates.has(dateKey)) {
        dates.set(dateKey, []);
      }
      dates.get(dateKey)!.push(wedding);
    });
    return dates;
  }, [weddings]);

  // Получаем первый день месяца и количество дней
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Понедельник = 0

  // Навигация по месяцам
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Проверяем, есть ли проект в этот день
  const getWeddingsForDate = (day: number): Wedding[] => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateKey = date.toDateString();
    return projectDates.get(dateKey) || [];
  };

  // Проверяем, является ли день сегодняшним
  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  // Проверяем, является ли день прошедшим
  const isPast = (day: number): boolean => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="w-full">
      {/* Header с навигацией */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="px-3 py-1 text-[16px] max-[1599px]:text-[14px] font-forum text-[#00000080] hover:text-black transition-colors cursor-pointer"
          aria-label="Предыдущий месяц"
        >
          ←
        </button>
        <div className="flex items-center gap-3">
          <h4 className="text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h4>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-[14px] max-[1599px]:text-[12px] font-forum text-[#00000080] hover:text-black transition-colors cursor-pointer border border-[#00000033] rounded"
          >
            Сегодня
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="px-3 py-1 text-[16px] max-[1599px]:text-[14px] font-forum text-[#00000080] hover:text-black transition-colors cursor-pointer"
          aria-label="Следующий месяц"
        >
          →
        </button>
      </div>

      {/* Дни недели */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-[14px] max-[1599px]:text-[12px] font-forum font-light text-[#00000080] py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Календарная сетка */}
      <div className="grid grid-cols-7 gap-1">
        {/* Пустые ячейки для дней до начала месяца */}
        {Array.from({ length: startingDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {/* Дни месяца */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const weddingsForDay = getWeddingsForDate(day);
          const hasProjects = weddingsForDay.length > 0;
          const today = isToday(day);
          const past = isPast(day);

          return (
            <div
              key={day}
              className={`
                aspect-square border border-[#00000033] rounded-lg p-1 flex flex-col items-center justify-center
                ${today ? 'bg-black text-white border-black' : ''}
                ${!today && past ? 'opacity-50' : ''}
                ${!today && !past && hasProjects ? 'bg-[#FBF9F5] hover:bg-gray-50 cursor-pointer' : ''}
                ${!today && !past && !hasProjects ? 'bg-white' : ''}
                transition-colors
              `}
              onClick={() => {
                if (hasProjects && onDateClick && weddingsForDay.length > 0) {
                  onDateClick(weddingsForDay[0].id);
                }
              }}
            >
              <span
                className={`
                  text-[14px] max-[1599px]:text-[12px] font-forum font-bold
                  ${today ? 'text-white' : 'text-black'}
                `}
              >
                {day}
              </span>
              {hasProjects && (
                <div className="flex gap-0.5 mt-0.5">
                  {weddingsForDay.slice(0, 3).map((wedding) => (
                    <div
                      key={wedding.id}
                      className={`
                        w-1.5 h-1.5 rounded-full
                        ${today ? 'bg-white' : 'bg-black'}
                      `}
                      title={`${wedding.couple_name_1_ru} & ${wedding.couple_name_2_ru}`}
                    />
                  ))}
                  {weddingsForDay.length > 3 && (
                    <span
                      className={`
                        text-[8px] font-forum
                        ${today ? 'text-white' : 'text-[#00000080]'}
                      `}
                    >
                      +{weddingsForDay.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Легенда */}
      {weddings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#00000033]">
          <p className="text-[12px] max-[1599px]:text-[11px] font-forum font-light text-[#00000080] mb-2">
            Точки обозначают даты проектов
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectsCalendar;

