import { useState, useMemo, useEffect } from 'react';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { FeaturedScroll } from '@/components/products/FeaturedScroll';
import { CategoryProducts } from '@/components/products/CategoryProducts';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { ZipCodeModal } from '@/components/location/ZipCodeModal';

const Index = () => {
  useForceLightTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showZipModal, setShowZipModal] = useState(false);

  useEffect(() => {
    const savedZip = localStorage.getItem('customer_zipcode');
    if (!savedZip) {
      setShowZipModal(true);
    }
  }, []);
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products?.filter(
      (product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const productsByCategory = useMemo(() => {
    if (!categories || !filteredProducts) return [];
    
    return categories.map((category) => ({
      category,
      products: filteredProducts.filter((p) => p.category_id === category.id),
    })).filter(({ products }) => products.length > 0);
  }, [categories, filteredProducts]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ZipCodeModal
        open={showZipModal}
        onConfirm={(data) => {
          localStorage.setItem('customer_zipcode', data.zipCode);
          localStorage.setItem('customer_address', JSON.stringify(data));
          setShowZipModal(false);
        }}
      />
      <MobileHeader onSearch={setSearchQuery} />
      
      <main className="flex-1 pb-20">
        {/* Featured Products Scroll */}
        {!searchQuery && <FeaturedScroll />}
        
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
        {searchQuery && productsByCategory.length === 0 && !productsLoading && (
          <div className="px-4 py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum produto encontrado para "{searchQuery}"
            </p>
          </div>
        )}
      </main>
      
      <BottomNavigation />
    </div>
  );
};

export default Index;
