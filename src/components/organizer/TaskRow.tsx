import React from 'react';
import type { Task, User, TaskGroup } from '../../types';
import { getTaskTitle } from '../../utils/taskUtils';
import { getPriorityText, getPriorityClasses } from '../../utils/priorityUtils';

interface TaskRowProps {
  task: Task;
  organizers: User[];
  taskGroups: TaskGroup[];
}

const TaskRow: React.FC<TaskRowProps> = ({ task, organizers, taskGroups }) => {
  const taskTitle = getTaskTitle(task);
  const organizer = organizers.find(o => o.id === task.organizer_id);
  const taskGroup = taskGroups.find(g => g.id === task.task_group_id);

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <p className={`text-[16px] font-forum ${
              task.status === 'completed' ? 'text-gray-400 line-through' : 'text-black'
            }`}>
              {taskTitle}
            </p>
            {task.priority && (
              <span className={getPriorityClasses(task.priority)}>
                {getPriorityText(task.priority)}
              </span>
            )}
            {task.status === 'completed' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 border border-green-300">
                Выполнено
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            {organizer && (
              <span className="flex items-center gap-1">
                <span>Организатор:</span>
                <span className="font-medium">{organizer.name}</span>
              </span>
            )}
            {taskGroup && (
              <span className="flex items-center gap-1">
                <span>Группа:</span>
                <span className="font-medium">{taskGroup.name}</span>
              </span>
            )}
            {!taskGroup && !organizer && (
              <span className="text-gray-400">Несортированное</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-sm text-gray-500 font-forum">
            {new Date(task.created_at).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TaskRow;

