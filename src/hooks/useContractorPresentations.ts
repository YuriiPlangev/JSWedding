import { useQuery } from '@tanstack/react-query';
import { presentationServiceExtended } from '../services/weddingService';
import type { CustomPresentation } from '../types';

export const useContractorPresentations = (weddingId: string | undefined) => {
  return useQuery<CustomPresentation[]>({
    queryKey: ['presentations', weddingId, 'contractor'],
    queryFn: async () => {
      if (!weddingId) return [];
      return await presentationServiceExtended.getPresentationsByWedding(weddingId, 'contractor');
    },
    enabled: !!weddingId,
    staleTime: 5 * 60 * 1000,
  });
};

export default useContractorPresentations;
