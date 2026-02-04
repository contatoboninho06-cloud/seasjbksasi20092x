import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

export function BottomNavigation() {
  const location = useLocation();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  const navItems = [
    { href: '/', label: 'Início', icon: Home },
    { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
    { href: '/carrinho', label: 'Carrinho', icon: ShoppingCart, badge: itemCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative flex items-center justify-center h-6 w-6">
                <Icon className={cn("h-6 w-6", isActive && "text-primary")} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-xs mt-1 font-medium",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
