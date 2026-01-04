import { useState, useCallback } from 'react';
import { taskService } from '../services/weddingService';

interface UseGroupDragAndDropProps {
  taskGroups: { group: any; tasks: any[]; isUnsorted?: boolean }[];
  setTaskGroups: React.Dispatch<React.SetStateAction<{ group: any; tasks: any[]; isUnsorted?: boolean }[]>>;
  loadOrganizerTasks: () => Promise<void>;
}

export const useGroupDragAndDrop = ({
  taskGroups,
  setTaskGroups,
  loadOrganizerTasks,
}: UseGroupDragAndDropProps) => {
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);

  const handleGroupDragStart = useCallback((e: React.DragEvent, groupId: string) => {
    setDraggedGroupId(groupId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleGroupDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggedGroupId) {
      e.dataTransfer.dropEffect = 'move';
    }
  }, [draggedGroupId]);

  const handleGroupDragEnd = useCallback(() => {
    setDraggedGroupId(null);
  }, []);

  const handleGroupDrop = useCallback(async (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    
    if (!draggedGroupId || draggedGroupId === targetGroupId) {
      handleGroupDragEnd();
      return;
    }

    // Находим индексы групп
    const draggedIndex = taskGroups.findIndex(
      ({ group }) => group?.id === draggedGroupId
    );
    const targetIndex = taskGroups.findIndex(
      ({ group }) => group?.id === targetGroupId
    );

    if (draggedIndex === -1 || targetIndex === -1) {
      handleGroupDragEnd();
      return;
    }

    // Оптимистичное обновление порядка
    setTaskGroups(prevGroups => {
      const newGroups = [...prevGroups];
      const [draggedGroup] = newGroups.splice(draggedIndex, 1);
      newGroups.splice(targetIndex, 0, draggedGroup);
      return newGroups;
    });

    try {
      // Обновляем порядок групп на сервере
      const draggedGroup = taskGroups[draggedIndex];
      if (draggedGroup?.group) {
        const result = await taskService.updateTaskGroup(draggedGroup.group.id, {
          ...draggedGroup.group,
          order: targetIndex,
        });

        if (!result) {
          await loadOrganizerTasks();
        }
      }
    } catch (err) {
      console.error('Error reordering groups:', err);
      await loadOrganizerTasks();
    } finally {
      handleGroupDragEnd();
    }
  }, [draggedGroupId, taskGroups, setTaskGroups, loadOrganizerTasks, handleGroupDragEnd]);

  return {
    draggedGroupId,
    handleGroupDragStart,
    handleGroupDragOver,
    handleGroupDragEnd,
    handleGroupDrop,
  };
};

