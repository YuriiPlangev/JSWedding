import { useState, useEffect, useCallback, useRef } from 'react';
import { taskService } from '../services/weddingService';
import type { Task, TaskGroup } from '../types';

interface TaskGroupWithTasks {
  group: TaskGroup | null;
  tasks: Task[];
  isUnsorted?: boolean;
}

export const useTaskGroups = (userId: string | null) => {
  const [taskGroups, setTaskGroups] = useState<TaskGroupWithTasks[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const loadedTasksUserIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  const loadOrganizerTasks = useCallback(async (useCache: boolean = true, showLoading: boolean = false) => {
    if (!userId) return;
    
    if (showLoading && taskGroups.length === 0) {
      setLoadingTasks(true);
    }
    
    try {
      const groupsWithTasks = await taskService.getOrganizerTasksByGroups(userId, useCache);
      setTaskGroups(groupsWithTasks);
    } catch (err) {
      console.error('Error loading organizer tasks:', err);
    } finally {
      if (showLoading) {
        setLoadingTasks(false);
      }
    }
  }, [userId, taskGroups.length]);

  useEffect(() => {
    if (userId && loadedTasksUserIdRef.current !== userId) {
      loadedTasksUserIdRef.current = userId;
      isInitialLoadRef.current = true;
      loadOrganizerTasks(false, true);
    }
  }, [userId, loadOrganizerTasks]);

  // Устанавливаем isInitialLoadRef в false после первой загрузки
  useEffect(() => {
    if (userId && taskGroups.length > 0) {
      isInitialLoadRef.current = false;
      setLoadingTasks(false);
    }
  }, [userId, taskGroups.length]);

  return {
    taskGroups,
    loadingTasks,
    loadOrganizerTasks,
    setTaskGroups,
  };
};

