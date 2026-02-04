import { useState, useMemo } from 'react';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Minus, Plus, ShoppingCart, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category } from '@/types/database';
import { useCart } from '@/contexts/CartContext';
import { useProductVariants, ProductVariant } from '@/hooks/useVariants';
import { VariantSelector } from '@/components/products/VariantSelector';
import { toast } from 'sonner';

export default function ProductDetailPage() {
  useForceLightTheme();
  const { productCode } = useParams<{ productCode: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('product_code', productCode)
        .single();
      
      if (error) throw error;
      return data as Product & { category: Category };
    },
  });

  // Fetch variant groups for this product
  const { data: variantGroups = [] } = useProductVariants(product?.id || null);

  // Check if any group requires selection
  const hasRequiredVariant = useMemo(() => {
    return variantGroups.some(g => g.is_required && g.variants.length > 0);
  }, [variantGroups]);

  const hasVariants = variantGroups.some(g => g.variants.length > 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    // Validate required variant selection
    if (hasRequiredVariant && !selectedVariant) {
      toast.error('Selecione uma opção obrigatória');
      return;
    }
    
    addItem(product, quantity, notes || undefined, selectedVariant || undefined);
    
    const variantText = selectedVariant ? ` (${selectedVariant.name})` : '';
    toast.success(`${quantity}x ${product.name}${variantText} adicionado ao carrinho`);
    navigate('/carrinho');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-64 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Produto não encontrado</p>
          <Link to="/">
            <Button>Voltar ao início</Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasDiscount = product.original_price && product.original_price > product.price;
  
  // Check if product is a beverage (no notes field needed)
  const isBeverage = product.category?.name?.toLowerCase().includes('bebida');
  
  // Calculate total based on selected variant or product price
  const unitPrice = selectedVariant?.price ?? product.price;
  const total = unitPrice * quantity;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header Image */}
      <div className="relative">
        <div className="h-64 w-full bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
              <span className="text-8xl">🍖</span>
            </div>
          )}
        </div>
        
        {/* Back Button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-4 left-4 rounded-full shadow-lg"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Product Code Badge */}
        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
          #{product.product_code}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Category */}
        {product.category && (
          <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
            {product.category.name}
          </span>
        )}

        {/* Title & Description */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
          {product.description && (
            <p className="text-muted-foreground mt-2">{product.description}</p>
          )}
        </div>

        {/* Prep Time */}
        {product.preparation_time && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Tempo de preparo: {product.preparation_time} min</span>
          </div>
        )}

        {/* Price - only show if no variants or no variant selected */}
        {(!hasVariants || !selectedVariant) && (
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-green-600">
              {hasVariants ? 'A partir de ' : ''}{formatPrice(product.price)}
            </span>
            {hasDiscount && !hasVariants && (
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(product.original_price!)}
              </span>
            )}
          </div>
        )}

        {/* Variant Selector */}
        {hasVariants && (
          <VariantSelector
            groups={variantGroups}
            selectedVariant={selectedVariant}
            onSelect={setSelectedVariant}
          />
        )}

        {/* Selected Variant Price */}
        {selectedVariant && (
          <div className="flex items-center gap-3 pt-2">
            <span className="text-sm text-muted-foreground">Selecionado:</span>
            <span className="font-semibold">{selectedVariant.name}</span>
            <span className="text-xl font-bold text-green-600">
              {formatPrice(selectedVariant.price)}
            </span>
          </div>
        )}

        {/* Notes - only for food items, not beverages */}
        {!isBeverage && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Observações (opcional)
            </label>
            <Textarea
              placeholder="Ex: Sem cebola, bem passado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-bottom">
        <div className="flex items-center gap-4">
          {/* Quantity Selector */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-bold text-lg">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Add to Cart Button */}
          <Button
            className="flex-1 h-12 gap-2 text-base"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-5 w-5" />
            Adicionar • {formatPrice(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}
