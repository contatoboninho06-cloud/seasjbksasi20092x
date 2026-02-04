import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  Menu,
  X,
  ChefHat,
  Store,
  BarChart3,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/admin/ThemeToggle';
import { useForceDarkTheme } from '@/hooks/useForceDarkTheme';

const navItems = [
  { href: '/gestao', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/gestao/pedidos', label: 'Pedidos', icon: ShoppingBag, showBadge: true },
  { href: '/gestao/produtos', label: 'Produtos', icon: Package },
  { href: '/gestao/categorias', label: 'Categorias', icon: ChefHat },
  { href: '/gestao/marketing', label: 'Marketing', icon: BarChart3 },
  { href: '/gestao/seguranca', label: 'Segurança', icon: Shield },
  { href: '/gestao/configuracoes', label: 'Configurações', icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: settings } = useStoreSettings();
  
  // Force dark theme for admin panel
  useForceDarkTheme();

  // Fetch pending orders count
  const { data: pendingCount } = useQuery({
    queryKey: ['pending-orders-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed', 'preparing']);
      return count || 0;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/gestao');
  };

  const LogoSection = () => (
    <div className="flex items-center gap-3">
      {settings?.logo_url ? (
        <img 
          src={settings.logo_url} 
          alt={settings.store_name || 'Logo'}
          className="h-10 w-10 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Store className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
      <div className="min-w-0">
        <h1 className="font-bold text-sidebar-foreground truncate">
          {settings?.store_name || 'Painel Admin'}
        </h1>
        <p className="text-xs text-sidebar-foreground/60 truncate">
          {settings?.store_subtitle || 'Administração'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-3">
          <LogoSection />
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:sticky left-0 z-40 w-64 bg-sidebar transition-transform lg:translate-x-0",
          "top-[57px] h-[calc(100vh-57px)] lg:top-0 lg:h-screen",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full">
            {/* Logo - Desktop only */}
            <div className="hidden lg:flex items-center px-6 py-5 border-b border-sidebar-border">
              <LogoSection />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1">{item.label}</span>
                    {item.showBadge && pendingCount && pendingCount > 0 ? (
                      <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </Badge>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-sidebar-border space-y-1">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-sidebar-foreground/60">Tema</span>
                <ThemeToggle />
              </div>
              <Link
                to="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <ShoppingBag className="h-5 w-5" />
                Ver Loja
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 py-2.5 h-auto text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                Sair
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:min-h-[calc(100vh)]">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
