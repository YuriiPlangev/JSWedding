import type { Task } from '../types';

interface TasksListProps {
  tasks: Task[];
  onTaskToggle?: (taskId: string, completed: boolean) => void;
  currentLanguage?: 'en' | 'ru' | 'ua';
}

// Функция для парсинга текста с ссылками в формате [текст](ссылка)
const parseTextWithLinks = (text: string) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: Array<{ type: 'text' | 'link'; content: string; href?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Добавляем текст до ссылки
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }

    // Добавляем ссылку
    const linkText = match[1];
    let linkUrl = match[2];
    
    // Если ссылка не начинается с http/https, добавляем https://
    if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
      linkUrl = `https://${linkUrl}`;
    }

    parts.push({
      type: 'link',
      content: linkText,
      href: linkUrl,
    });

    lastIndex = linkRegex.lastIndex;
  }

  // Добавляем оставшийся текст после последней ссылки
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  // Если не было найдено ссылок, возвращаем весь текст как есть
  if (parts.length === 0) {
    return [{ type: 'text' as const, content: text }];
  }

  return parts;
};

const TasksList = ({ tasks, onTaskToggle, currentLanguage = 'ru' }: TasksListProps) => {
  const handleCheckboxChange = (taskId: string, checked: boolean) => {
    if (onTaskToggle) {
      onTaskToggle(taskId, checked);
    }
  };

  // Функция для получения названия задания на текущем языке
  const getTaskTitle = (task: Task): string => {
    if (currentLanguage === 'en' && task.title_en) return task.title_en;
    if (currentLanguage === 'ru' && task.title_ru) return task.title_ru;
    if (currentLanguage === 'ua' && task.title_ua) return task.title_ua;
    // Fallback на основное поле title или первое доступное
    return task.title || task.title_en || task.title_ru || task.title_ua || '';
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <ul className='pr-3 sm:pr-4 max-[1599px]:pr-4 md:max-[1599px]:pr-6 lg:max-[1599px]:pr-8 min-[1300px]:max-[1599px]:pr-10'>
      {tasks.map((task) => {
        const isCompleted = task.status === 'completed';
        const taskTitle = getTaskTitle(task);

        return (
          <li key={task.id} className='flex items-center gap-4 sm:gap-5 md:gap-6 lg:gap-8 max-[1599px]:gap-4 lg:max-[1599px]:gap-4 min-[1300px]:max-[1599px]:gap-6 py-4 sm:py-5 md:py-6 max-[1599px]:py-3 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4'>
            <label className="custom-checkbox cursor-pointer">
              <input
                type="checkbox"
                checked={isCompleted}
                onChange={(e) => handleCheckboxChange(task.id, e.target.checked)}
                className="cursor-pointer"
              />
              <span className="checkbox-label"></span>
            </label>
            <p 
              className='text-[13px] sm:text-[15px] md:text-[17px] lg:text-[22px] max-[1599px]:text-[17px] lg:max-[1599px]:text-[16px] min-[1300px]:max-[1599px]:text-[18px] font-forum font-light break-words'
            >
              {/* Парсим текст задания на наличие ссылок в формате [текст](ссылка) */}
              {parseTextWithLinks(taskTitle).map((part, index) => {
                if (part.type === 'link') {
                  return (
                    <a
                      key={index}
                      href={part.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className='underline text-black font-bold cursor-pointer hover:opacity-70 transition-opacity'
                      onClick={(e) => {
                        e.preventDefault();
                        if (part.href) {
                          window.open(part.href, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      {part.content}
                    </a>
                  );
                }
                return <span key={index}>{part.content}</span>;
              })}
              {/* Поддержка старого формата через поля link и link_text для обратной совместимости */}
              {!task.title.includes('[') && !task.title.includes(']') && task.link && (() => {
                // Выбираем текст ссылки в зависимости от текущего языка
                const linkText = currentLanguage === 'ua' && task.link_text_ua 
                  ? task.link_text_ua 
                  : currentLanguage === 'ru' && task.link_text_ru 
                  ? task.link_text_ru 
                  : currentLanguage === 'en' && task.link_text_en 
                  ? task.link_text_en 
                  : task.link_text;
                
                return linkText ? (
                  <>
                    {' '}
                    <a
                      href={task.link.startsWith('http') ? task.link : `https://${task.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className='underline text-black font-bold cursor-pointer hover:opacity-70 transition-opacity'
                      onClick={(e) => {
                        e.preventDefault();
                        const href = task.link?.startsWith('http') ? task.link : `https://${task.link}`;
                        if (href) {
                          window.open(href, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      {linkText}
                    </a>
                  </>
                ) : null;
              })()}
            </p>
          </li>
        );
      })}
    </ul>
  );
};

export default TasksList;

