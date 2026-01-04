import type { Task } from '../types';

/**
 * Получает заголовок задания с учетом языка
 */
export const getTaskTitle = (task: Task): string => {
  if (task.title_ru) return task.title_ru;
  return task.title || task.title_en || task.title_ua || '';
};

/**
 * Получает имя группы или дефолтное значение
 */
export const getGroupName = (group: any): string => {
  if (!group) return 'Несортированные задачи';
  return group.name;
};

/**
 * Разделяет задания на активные и выполненные
 */
export const splitTasksByStatus = (
  tasks: Task[],
  initiallyCompletedTaskIds: Set<string>
): { active: Task[]; completed: Task[] } => {
  const active = tasks.filter(t => {
    if (t.status !== 'completed') return true;
    return !initiallyCompletedTaskIds.has(t.id);
  });

  const completed = tasks.filter(t => 
    t.status === 'completed' && initiallyCompletedTaskIds.has(t.id)
  );

  return { active, completed };
};

