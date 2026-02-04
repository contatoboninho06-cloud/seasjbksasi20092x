import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/types/database';
import { useCart } from '@/contexts/CartContext';
import { useFeaturedProducts } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export function FeaturedScroll() {
  const { data: products, isLoading } = useFeaturedProducts();
  const { addItem } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    toast.success(`${product.name} adicionado ao carrinho`);
  };

  if (isLoading) {
    return (
      <div className="px-4 py-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
          DESTAQUES
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-36 flex-shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!products?.length) return null;

  return (
    <div className="px-4 py-4">
      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
        DESTAQUES
      </h2>
      
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/produto/${product.product_code}`}
            className="flex-shrink-0 w-36"
          >
            <div className="relative">
              <div className="h-28 w-full rounded-xl overflow-hidden bg-muted">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
                    <span className="text-4xl">🍖</span>
                  </div>
                )}
              </div>
              
              <Button
                size="icon"
                className="absolute -bottom-2 right-2 h-8 w-8 rounded-full shadow-lg bg-primary hover:bg-primary/90"
                onClick={(e) => handleAddToCart(e, product)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="mt-3">
              <h3 className="font-medium text-sm text-foreground line-clamp-2">
                {product.name}
              </h3>
              <span className="font-bold text-green-600 text-sm">
                {formatPrice(product.price)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
