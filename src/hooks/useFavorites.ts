import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useFavorites() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const res = await fetch('/api/catalog/favorites');
      if (!res.ok) return { productIds: [] as string[] };
      return res.json() as Promise<{ productIds: string[] }>;
    },
    staleTime: 1000 * 60 * 5,
  });

  const ids = data?.productIds ?? [];

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (ids.includes(productId)) {
        await fetch(`/api/catalog/favorites/${productId}`, { method: 'DELETE' });
      } else {
        await fetch('/api/catalog/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
      }
    },
    onMutate: async (productId: string) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const prev = queryClient.getQueryData<{ productIds: string[] }>(['favorites']);
      queryClient.setQueryData(['favorites'], (old: { productIds: string[] } | undefined) => {
        const current = old?.productIds ?? [];
        return {
          productIds: current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [...current, productId],
        };
      });
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(['favorites'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  return {
    favoriteIds: new Set(ids),
    isLoading,
    toggle: (productId: string) => toggle.mutate(productId),
    isFavorited: (productId: string) => ids.includes(productId),
  };
}
