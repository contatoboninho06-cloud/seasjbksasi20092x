import { useState } from 'react';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Product, Category } from '@/types/database';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product & { category?: Category };
}

export function ProductCard({ product }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleAddToCart = () => {
    addItem(product, quantity);
    toast.success(`${quantity}x ${product.name} adicionado ao carrinho`);
    setQuantity(1);
  };

  return (
    <Card className="card-product overflow-hidden group">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-warm/10">
            <span className="text-4xl">🍖</span>
          </div>
        )}
        
        {product.is_featured && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
            Destaque
          </span>
        )}
        
        {product.category && (
          <span className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full">
            {product.category.name}
          </span>
        )}
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg text-foreground line-clamp-1">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {product.description}
          </p>
        )}
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">
            {formatPrice(product.price)}
          </span>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-secondary rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              size="icon"
              className="h-10 w-10"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
