import type { Task } from '../types';

interface TasksListProps {
  tasks: Task[];
  onTaskToggle?: (taskId: string, completed: boolean) => void;
}

const TasksList = ({ tasks, onTaskToggle }: TasksListProps) => {
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
          <li key={task.id} className='flex items-center gap-8 py-6'>
            <label className="custom-checkbox">
              <input
                type="checkbox"
                checked={isCompleted}
                onChange={(e) => handleCheckboxChange(task.id, e.target.checked)}
              />
              <span className="checkbox-label"></span>
            </label>
            <p className='text-[24px] font-gilroy font-light'>
              {task.title}
              {task.link && task.link_text && (
                <>
                  :{' '}
                  <span className='text-[24px] font-gilroy font-light underline text-[#4D3628] cursor-pointer hover:opacity-70 transition-opacity'>
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

