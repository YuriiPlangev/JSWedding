import type { Task } from '../types';
import { getFontStyle } from '../utils/fontUtils';

interface TasksListProps {
  tasks: Task[];
  onTaskToggle?: (taskId: string, completed: boolean) => void;
  currentLanguage?: 'en' | 'ru' | 'ua';
}

const TasksList = ({ tasks, onTaskToggle, currentLanguage }: TasksListProps) => {
  const handleCheckboxChange = (taskId: string, checked: boolean) => {
    if (onTaskToggle) {
      onTaskToggle(taskId, checked);
    }
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <ul>
      {tasks.map((task) => {
        const isCompleted = task.status === 'completed';

        return (
          <li key={task.id} className='flex items-center gap-8 max-[1599px]:gap-4 lg:max-[1599px]:gap-4 min-[1300px]:max-[1599px]:gap-6 py-6 max-[1599px]:py-3 lg:max-[1599px]:py-3 min-[1300px]:max-[1599px]:py-4'>
            <label className="custom-checkbox">
              <input
                type="checkbox"
                checked={isCompleted}
                onChange={(e) => handleCheckboxChange(task.id, e.target.checked)}
              />
              <span className="checkbox-label"></span>
            </label>
            <p 
              className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-gilroy font-light'
              style={getFontStyle(task.title)}
            >
              {task.title}
              {task.link && task.link_text && (
                <>
                  :{' '}
                  <span 
                    className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-gilroy font-light underline text-[#4D3628] cursor-pointer hover:opacity-70 transition-opacity'
                    style={getFontStyle(task.link_text)}
                  >
                    <a href={task.link.startsWith('http') ? task.link : `https://${task.link}`} target="_blank" rel="noopener noreferrer">
                      {task.link_text}
                    </a>
                  </span>
                </>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
};

export default TasksList;

