import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useStoreSettings, useIsStoreOpen } from '@/hooks/useStoreSettings';
import { cn } from '@/lib/utils';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { getItemCount } = useCart();
  const { data: settings } = useStoreSettings();
  const { isOpen, message } = useIsStoreOpen();
  
  const itemCount = getItemCount();

  const navLinks = [
    { href: '/', label: 'Início' },
    { href: '/cardapio', label: 'Cardápio' },
    { href: '/pedidos', label: 'Meus Pedidos' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top bar with store status */}
      <div className="bg-foreground text-background">
        <div className="container-app flex items-center justify-between py-1.5 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>{settings?.opening_time?.slice(0, 5)} - {settings?.closing_time?.slice(0, 5)}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              <span>Entrega e Retirada</span>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 font-medium",
            isOpen ? "text-green-400" : "text-red-400"
          )}>
            <span className={cn(
              "h-2 w-2 rounded-full",
              isOpen ? "bg-green-400" : "bg-red-400"
            )} />
            {message}
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container-app">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.store_name || 'Logo'}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-warm">
                <span className="text-xl font-bold text-primary-foreground">🔥</span>
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground">
                {settings?.store_name || 'Churrascaria Gourmet'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {settings?.store_subtitle || 'Delivery de Qualidade'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  location.pathname === link.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link to="/carrinho">
              <Button variant="outline" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-slide-in-up">
          <nav className="container-app py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "block px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  location.pathname === link.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
