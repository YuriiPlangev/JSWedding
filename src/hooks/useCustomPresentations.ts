import { useQuery } from '@tanstack/react-query';
import { presentationServiceExtended } from '../services/weddingService';
import type { CustomPresentation } from '../types';

export const useCustomPresentations = (weddingId: string | undefined) => {
  return useQuery<CustomPresentation[]>({
    queryKey: ['presentations', weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      return await presentationServiceExtended.getPresentationsByWedding(weddingId);
    },
    enabled: !!weddingId,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
};

export default useCustomPresentations;

