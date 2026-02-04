import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/products/ProductGrid';
import { useFeaturedProducts } from '@/hooks/useProducts';

export function FeaturedProducts() {
  const { data: products, isLoading } = useFeaturedProducts();

  return (
    <section className="py-16">
      <div className="container-app">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Mais Pedidos
            </h2>
            <p className="text-muted-foreground mt-1">
              Os favoritos dos nossos clientes
            </p>
          </div>
          
          <Link to="/cardapio">
            <Button variant="ghost" className="gap-2">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <ProductGrid 
          products={products?.slice(0, 4) || []} 
          isLoading={isLoading} 
        />
      </div>
    </section>
  );
}
