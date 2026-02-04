import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category, ProductOption } from '@/types/database';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('is_available', true)
        .order('name');
      
      if (error) throw error;
      return data as (Product & { category: Category })[];
    },
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('is_available', true)
        .eq('is_featured', true)
        .order('name');
      
      if (error) throw error;
      return data as (Product & { category: Category })[];
    },
  });
}

export function useProductsByCategory(categoryId: string | null) {
  return useQuery({
    queryKey: ['products', 'category', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('is_available', true);
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) throw error;
      return data as (Product & { category: Category })[];
    },
    enabled: true,
  });
}

export function useProductOptions(productId: string) {
  return useQuery({
    queryKey: ['product-options', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', productId)
        .eq('is_available', true);
      
      if (error) throw error;
      return data as ProductOption[];
    },
    enabled: !!productId,
  });
}
