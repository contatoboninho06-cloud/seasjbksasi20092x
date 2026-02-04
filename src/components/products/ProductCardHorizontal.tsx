import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product, Category } from '@/types/database';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface ProductCardHorizontalProps {
  product: Product & { category?: Category };
}

export function ProductCardHorizontal({ product }: ProductCardHorizontalProps) {
  const { addItem } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    toast.success(`${product.name} adicionado ao carrinho`);
  };

  const hasDiscount = product.original_price && product.original_price > product.price;

  return (
    <Link to={`/produto/${product.product_code}`}>
      <div className="flex items-stretch gap-3 p-3 bg-card rounded-xl shadow-sm border border-border/50 active:bg-muted/50 transition-colors">
        {/* Product Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
          <div>
            <h3 className="font-semibold text-foreground line-clamp-2 text-sm">
              {product.name}
            </h3>
            {product.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
          
          <div className="mt-2">
            <span className="text-xs text-muted-foreground">A partir de</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-green-600 text-base">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.original_price!)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Product Image */}
        <div className="relative flex-shrink-0">
          <div className="h-24 w-24 rounded-lg overflow-hidden bg-muted">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
                <span className="text-3xl">🍖</span>
              </div>
            )}
          </div>
          
          {/* Add Button */}
          <Button
            size="icon"
            className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            onClick={handleAddToCart}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Link>
  );
}
