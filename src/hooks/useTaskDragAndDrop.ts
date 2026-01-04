import { useState, useCallback } from 'react';
import { taskService } from '../services/weddingService';
import type { Task } from '../types';

interface UseTaskDragAndDropProps {
  setTaskGroups: React.Dispatch<React.SetStateAction<{ group: any; tasks: Task[]; isUnsorted?: boolean }[]>>;
  loadOrganizerTasks: () => Promise<void>;
}

export const useTaskDragAndDrop = ({
  setTaskGroups,
  loadOrganizerTasks,
}: UseTaskDragAndDropProps) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedFromGroupId, setDraggedFromGroupId] = useState<string | null>(null);

  const handleTaskDragStart = useCallback((e: React.DragEvent, taskId: string, groupId: string | null) => {
    setDraggedTaskId(taskId);
    setDraggedFromGroupId(groupId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleTaskDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleTaskDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDraggedFromGroupId(null);
  }, []);

  const handleTaskDropOnGroup = useCallback(async (e: React.DragEvent, targetGroupId: string | null) => {
    e.preventDefault();
    
    if (!draggedTaskId || draggedFromGroupId === targetGroupId) {
      handleTaskDragEnd();
      return;
    }

    // Оптимистичное обновление
    setTaskGroups(prevGroups => {
      let taskToMove: Task | null = null;
      const newGroups = prevGroups.map(({ group, tasks, isUnsorted }) => {
        const currentGroupId = group?.id || null;
        if (currentGroupId === draggedFromGroupId) {
          taskToMove = tasks.find(t => t.id === draggedTaskId) || null;
          return {
            group,
            tasks: tasks.filter(t => t.id !== draggedTaskId),
            isUnsorted,
          };
        }
        return { group, tasks, isUnsorted };
      });

      if (taskToMove) {
        return newGroups.map(({ group, tasks, isUnsorted }) => {
          const currentGroupId = group?.id || null;
          if (currentGroupId === targetGroupId) {
            return {
              group,
              tasks: [...tasks, { ...taskToMove!, task_group_id: targetGroupId }],
              isUnsorted,
            };
          }
          return { group, tasks, isUnsorted };
        });
      }

      return newGroups;
    });

    try {
      const result = await taskService.updateOrganizerTask(draggedTaskId, {
        task_group_id: targetGroupId,
      });

      if (!result) {
        await loadOrganizerTasks();
      }
    } catch (err) {
      console.error('Error moving task:', err);
      await loadOrganizerTasks();
    } finally {
      handleTaskDragEnd();
    }
  }, [draggedTaskId, draggedFromGroupId, setTaskGroups, loadOrganizerTasks, handleTaskDragEnd]);

  return {
    draggedTaskId,
    handleTaskDragStart,
    handleTaskDragOver,
    handleTaskDragEnd,
    handleTaskDropOnGroup,
  };
};

