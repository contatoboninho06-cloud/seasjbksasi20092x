import { Link } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import { Skeleton } from '@/components/ui/skeleton';

const categoryIcons: Record<string, string> = {
  'Carnes Nobres': '🥩',
  'Marmitas': '🍱',
  'Combos': '🍽️',
  'Acompanhamentos': '🥗',
  'Bebidas': '🥤',
};

export function CategorySection() {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return (
      <section className="py-12 bg-secondary/30">
        <div className="container-app">
          <div className="text-center mb-8">
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-secondary/30">
      <div className="container-app">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Categorias
          </h2>
          <p className="text-muted-foreground mt-1">
            Explore nosso cardápio completo
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories?.map((category) => (
            <Link
              key={category.id}
              to={`/cardapio?categoria=${category.id}`}
              className="group"
            >
              <div className="bg-card rounded-xl p-6 text-center shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-3">
                  {categoryIcons[category.name] || '🍴'}
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {category.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
