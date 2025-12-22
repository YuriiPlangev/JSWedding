import { useQuery, useQueryClient } from '@tanstack/react-query';
import { weddingService, taskService, documentService } from '../services/weddingService';

// Хук для загрузки данных свадьбы клиента
export const useClientWedding = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ['wedding', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      return await weddingService.getClientWedding(clientId, true);
    },
    enabled: !!clientId, // Запрос выполняется только если есть clientId
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
};

// Хук для загрузки заданий свадьбы
export const useWeddingTasks = (weddingId: string | undefined) => {
  return useQuery({
    queryKey: ['tasks', weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      return await taskService.getWeddingTasks(weddingId, true);
    },
    enabled: !!weddingId,
    staleTime: 3 * 60 * 1000, // 3 минуты
    gcTime: 10 * 60 * 1000,
  });
};

// Хук для загрузки документов свадьбы
export const useWeddingDocuments = (weddingId: string | undefined) => {
  return useQuery({
    queryKey: ['documents', weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      return await documentService.getWeddingDocuments(weddingId, true);
    },
    enabled: !!weddingId,
    staleTime: 10 * 60 * 1000, // 10 минут
    gcTime: 15 * 60 * 1000,
  });
};

// Хук для предзагрузки данных свадьбы
export const usePrefetchWeddingData = () => {
  const queryClient = useQueryClient();

  const prefetchWeddingData = async (clientId: string) => {
    // Предзагружаем свадьбу
    await queryClient.prefetchQuery({
      queryKey: ['wedding', clientId],
      queryFn: async () => {
        const wedding = await weddingService.getClientWedding(clientId, true);
        
        // Если свадьба найдена, предзагружаем задания и документы
        if (wedding) {
          queryClient.prefetchQuery({
            queryKey: ['tasks', wedding.id],
            queryFn: () => taskService.getWeddingTasks(wedding.id, true),
            staleTime: 3 * 60 * 1000,
          });

          queryClient.prefetchQuery({
            queryKey: ['documents', wedding.id],
            queryFn: () => documentService.getWeddingDocuments(wedding.id, true),
            staleTime: 10 * 60 * 1000,
          });
        }
        
        return wedding;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchWeddingData };
};

