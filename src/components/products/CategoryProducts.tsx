import { ProductCardHorizontal } from './ProductCardHorizontal';
import { Product, Category } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryProductsProps {
  category: Category;
  products: (Product & { category?: Category })[];
  isLoading?: boolean;
}

export function CategoryProducts({ category, products, isLoading }: CategoryProductsProps) {
  if (isLoading) {
    return (
      <div className="px-4 py-4">
        <Skeleton className="h-5 w-40 mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <div className="px-4 py-4">
      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
        {category.name}
      </h2>
      
      <div className="space-y-3">
        {products.map((product) => (
          <ProductCardHorizontal key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
