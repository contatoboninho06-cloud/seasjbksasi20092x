import { Category } from '@/types/database';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isLoading?: boolean;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading,
}: CategoryFilterProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <Button
        variant={selectedCategory === null ? 'default' : 'outline'}
        className={cn(
          "rounded-full flex-shrink-0",
          selectedCategory === null && "bg-primary text-primary-foreground"
        )}
        onClick={() => onSelectCategory(null)}
      >
        Todos
      </Button>
      
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? 'default' : 'outline'}
          className={cn(
            "rounded-full flex-shrink-0",
            selectedCategory === category.id && "bg-primary text-primary-foreground"
          )}
          onClick={() => onSelectCategory(category.id)}
        >
          {category.name}
        </Button>
      ))}
    </div>
  );
}
