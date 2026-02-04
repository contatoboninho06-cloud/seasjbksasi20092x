import { Link, useNavigate } from 'react-router-dom';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { useCart } from '@/contexts/CartContext';
import { useStoreSettings } from '@/hooks/useStoreSettings';

export default function CartPage() {
  useForceLightTheme();
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, getSubtotal } = useCart();
  const { data: settings } = useStoreSettings();
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const DELIVERY_FEE = 3;
  const subtotal = getSubtotal();
  const total = subtotal + DELIVERY_FEE;
  const minOrderValue = settings?.min_order_value || 0;
  const canProceed = subtotal >= minOrderValue;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg">Carrinho</h1>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center pb-20">
          <div className="text-center px-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Carrinho vazio
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Adicione itens do cardápio para começar
            </p>
            <Link to="/">
              <Button className="gap-2">
                Ver Cardápio
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </main>
        
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">Carrinho</h1>
          <span className="text-sm text-muted-foreground">({items.length} itens)</span>
        </div>
      </header>

      <main className="flex-1 pb-40">
        {/* Cart Items */}
        <div className="p-4 space-y-3">
          {items.map((item) => {
            const itemPrice = item.selectedVariant?.price ?? item.product.price;
            const itemKey = `${item.product.id}-${item.selectedVariant?.id || 'no-variant'}`;
            const variantId = item.selectedVariant?.id;
            
            return (
              <div key={itemKey} className="flex gap-3 p-3 bg-card rounded-xl border border-border/50">
                <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {(item.selectedVariant?.image_url || item.product.image_url) ? (
                    <img
                      src={item.selectedVariant?.image_url || item.product.image_url}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-2xl">🍖</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                        {item.product.name}
                      </h3>
                      {item.product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {item.product.description.slice(0, 50)}
                          {item.product.description.length > 50 ? '...' : ''}
                        </p>
                      )}
                      {item.selectedVariant && (
                        <p className="text-xs text-primary font-medium mt-0.5">
                          {item.selectedVariant.name}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 -mr-2 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.product.id, variantId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Obs: {item.notes}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(itemPrice)} un.
                      </p>
                      <span className="font-bold text-green-600">
                        {formatPrice(itemPrice * item.quantity)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-muted rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1, variantId)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-6 text-center font-medium text-sm">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1, variantId)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Fixed Bottom Summary */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border p-4 space-y-3 md:bottom-0">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Entrega</span>
          <span className="font-medium text-green-600">{formatPrice(DELIVERY_FEE)}</span>
        </div>

        <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
          <span>Total</span>
          <span className="text-green-600">{formatPrice(total)}</span>
        </div>
        
        {!canProceed && (
          <p className="text-xs text-destructive">
            Pedido mínimo: {formatPrice(minOrderValue)}
          </p>
        )}
        
        <Link to="/checkout">
          <Button className="w-full h-12 text-base" disabled={!canProceed}>
            Finalizar Pedido • {formatPrice(total)}
          </Button>
        </Link>
      </div>
      
      <BottomNavigation />
    </div>
  );
}
