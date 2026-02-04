import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { DynamicMetaProvider } from "@/components/DynamicMetaProvider";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { useStoreSettings } from "@/hooks/useStoreSettings";

declare global {
  interface Window {
    initMetaPixel?: (pixelId: string) => void;
    initUtmifyPixel?: (pixelId: string) => void;
    utmifyReady?: boolean;
    googlePixelId?: string;
    _fbPixelId?: string;
  }
}
import Index from "./pages/Index";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderTracking from "./pages/OrderTracking";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";

import Dashboard from "./pages/admin/Dashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminMarketing from "./pages/admin/AdminMarketing";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSecurity from "./pages/admin/AdminSecurity";

const queryClient = new QueryClient();

// Componente interno para usar hooks
function AppContent() {
  // Captura UTM params ao iniciar o app
  useUTMTracking();
  
  // Carrega settings para inicializar pixels
  const { data: settings } = useStoreSettings();
  
  // Inicializa pixels dinamicamente
  useEffect(() => {
    if (settings?.meta_pixel_id && window.initMetaPixel) {
      window.initMetaPixel(settings.meta_pixel_id);
    }
    if (settings?.utmify_pixel_id && window.initUtmifyPixel) {
      window.initUtmifyPixel(settings.utmify_pixel_id);
    }
  }, [settings?.meta_pixel_id, settings?.utmify_pixel_id]);
  
  return (
    <>
      <DynamicMetaProvider />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/cardapio" element={<Menu />} />
          <Route path="/carrinho" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/pedidos/:orderId" element={<OrderTracking />} />
          <Route path="/produto/:productCode" element={<ProductDetail />} />
          
          {/* Admin Routes - Rota camuflada /gestao */}
          <Route element={<AdminGuard />}>
            <Route path="/gestao" element={<Dashboard />} />
            <Route path="/gestao/pedidos" element={<AdminOrders />} />
            <Route path="/gestao/produtos" element={<AdminProducts />} />
            <Route path="/gestao/categorias" element={<AdminCategories />} />
            <Route path="/gestao/marketing" element={<AdminMarketing />} />
            <Route path="/gestao/seguranca" element={<AdminSecurity />} />
            <Route path="/gestao/configuracoes" element={<AdminSettings />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
