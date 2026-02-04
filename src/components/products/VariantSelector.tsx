import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VariantGroupWithVariants, ProductVariant } from '@/hooks/useVariants';

interface VariantSelectorProps {
  groups: VariantGroupWithVariants[];
  selectedVariant: ProductVariant | null;
  onSelect: (variant: ProductVariant | null) => void;
}

export function VariantSelector({ groups, selectedVariant, onSelect }: VariantSelectorProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (groups.length === 0) return null;

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{group.name}</h3>
            {group.is_required && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Obrigatório
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {group.variants.map((variant) => {
              const isSelected = selectedVariant?.id === variant.id;

              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => onSelect(isSelected ? null : variant)}
                  className={cn(
                    "relative flex flex-col items-center p-2 rounded-xl border-2 transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {/* Check mark */}
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}

                  {/* Image */}
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                    {variant.image_url ? (
                      <img
                        src={variant.image_url}
                        alt={variant.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl">
                        🥤
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <p className="text-xs font-medium text-foreground text-center line-clamp-2 leading-tight">
                    {variant.name}
                  </p>

                  {/* Price */}
                  <p className="text-sm font-bold text-primary mt-1">
                    {formatPrice(variant.price)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
