import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VariantGroup {
  id: string;
  product_id: string;
  name: string;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  group_id: string | null;
  name: string;
  price: number;
  image_url: string | null;
  display_order: number;
  is_available: boolean;
  created_at: string;
}

export interface VariantGroupWithVariants extends VariantGroup {
  variants: ProductVariant[];
}

// Fetch variant groups with their variants for a product
export function useProductVariants(productId: string | null) {
  return useQuery({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      if (!productId) return [];

      // Fetch groups
      const { data: groups, error: groupsError } = await supabase
        .from('variant_groups')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('display_order');

      if (groupsError) throw groupsError;

      // Fetch variants (product_options with group_id)
      const { data: variants, error: variantsError } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', productId)
        .eq('is_available', true)
        .order('display_order');

      if (variantsError) throw variantsError;

      // Combine groups with their variants
      const groupsWithVariants: VariantGroupWithVariants[] = (groups || []).map(group => ({
        ...group,
        variants: (variants || []).filter(v => v.group_id === group.id) as ProductVariant[],
      }));

      return groupsWithVariants;
    },
    enabled: !!productId,
  });
}

// Fetch all variant groups for admin (including inactive)
export function useAdminVariantGroups(productId: string | null) {
  return useQuery({
    queryKey: ['admin-variant-groups', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('variant_groups')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (error) throw error;
      return data as VariantGroup[];
    },
    enabled: !!productId,
  });
}

// Fetch all variants for admin (including unavailable)
export function useAdminVariants(productId: string | null) {
  return useQuery({
    queryKey: ['admin-variants', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!productId,
  });
}

// Mutations for variant groups
export function useVariantGroupMutations() {
  const queryClient = useQueryClient();

  const createGroup = useMutation({
    mutationFn: async (data: Omit<VariantGroup, 'id' | 'created_at'>) => {
      const { data: result, error } = await supabase
        .from('variant_groups')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-variant-groups', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['product-variants', variables.product_id] });
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, ...data }: Partial<VariantGroup> & { id: string; product_id: string }) => {
      const { error } = await supabase
        .from('variant_groups')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-variant-groups', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['product-variants', variables.product_id] });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from('variant_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-variant-groups', productId] });
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
  });

  return { createGroup, updateGroup, deleteGroup };
}

// Mutations for variants (product_options)
export function useVariantMutations() {
  const queryClient = useQueryClient();

  const createVariant = useMutation({
    mutationFn: async (data: Omit<ProductVariant, 'id' | 'created_at'>) => {
      const { data: result, error } = await supabase
        .from('product_options')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-variants', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['product-variants', variables.product_id] });
    },
  });

  const updateVariant = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProductVariant> & { id: string; product_id: string }) => {
      const { error } = await supabase
        .from('product_options')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-variants', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['product-variants', variables.product_id] });
    },
  });

  const deleteVariant = useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from('product_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-variants', productId] });
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
  });

  return { createVariant, updateVariant, deleteVariant };
}
