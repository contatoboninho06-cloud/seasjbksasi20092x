import { useState, useMemo } from 'react';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { CategoryProducts } from '@/components/products/CategoryProducts';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

export default function MenuPage() {
  useForceLightTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('categoria')
  );
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    if (categoryId) {
      setSearchParams({ categoria: categoryId });
    } else {
      setSearchParams({});
    }
  };

  const filteredProducts = useMemo(() => {
    return products?.filter((product) => {
      const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const productsByCategory = useMemo(() => {
    if (!categories || !filteredProducts) return [];
    
    return categories.map((category) => ({
      category,
      products: filteredProducts.filter((p) => p.category_id === category.id),
    })).filter(({ products }) => products.length > 0);
  }, [categories, filteredProducts]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">Cardápio</h1>
        </div>
        
        {/* Category Tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => handleCategoryChange(null)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              !selectedCategory
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            Todos
          </button>
          {categories?.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </header>
      
      <main className="flex-1 pb-20">
        {/* Products by Category */}
        {productsByCategory.map(({ category, products }) => (
          <CategoryProducts
            key={category.id}
            category={category}
            products={products}
            isLoading={productsLoading || categoriesLoading}
          />
        ))}

        {/* No results */}
        {productsByCategory.length === 0 && !productsLoading && (
          <div className="px-4 py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum produto encontrado
            </p>
          </div>
        )}
      </main>
      
      <BottomNavigation />
    </div>
  );
}
