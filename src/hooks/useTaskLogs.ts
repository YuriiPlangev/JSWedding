import { useState, useCallback } from 'react';
import { taskService } from '../services/weddingService';
import type { OrganizerTaskLog } from '../types';

export const useTaskLogs = () => {
  const [taskLogs, setTaskLogs] = useState<Record<string, OrganizerTaskLog[]>>({});
  const [loadingLogs, setLoadingLogs] = useState<Record<string, boolean>>({});
  const [expandedTaskLogs, setExpandedTaskLogs] = useState<Set<string>>(new Set());

  const loadTaskLogs = useCallback(async (taskId: string) => {
    if (loadingLogs[taskId] || taskLogs[taskId]) return;
    
    setLoadingLogs(prev => ({ ...prev, [taskId]: true }));
    try {
      const logs = await taskService.getOrganizerTaskLogs(taskId, 50);
      setTaskLogs(prev => ({ ...prev, [taskId]: logs }));
    } catch (err) {
      console.error('Error loading task logs:', err);
    } finally {
      setLoadingLogs(prev => ({ ...prev, [taskId]: false }));
    }
  }, [loadingLogs, taskLogs]);

  const toggleTaskLogs = useCallback((taskId: string) => {
    setExpandedTaskLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
        loadTaskLogs(taskId);
      }
      return newSet;
    });
  }, [loadTaskLogs]);

  return {
    taskLogs,
    loadingLogs,
    expandedTaskLogs,
    toggleTaskLogs,
    loadTaskLogs,
  };
};

