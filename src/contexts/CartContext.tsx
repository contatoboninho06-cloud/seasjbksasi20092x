import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product, ProductOption } from '@/types/database';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, notes?: string, selectedVariant?: ProductOption) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getTotal: (deliveryFee?: number, discount?: number) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'churrascaria-cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, quantity = 1, notes?: string, selectedVariant?: ProductOption) => {
    setItems(prev => {
      // Create a unique key for this item based on product ID and variant
      const variantId = selectedVariant?.id || 'no-variant';
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && (item.selectedVariant?.id || 'no-variant') === variantId
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        if (notes) updated[existingIndex].notes = notes;
        return updated;
      }
      
      return [...prev, { product, quantity, notes, selectedVariant }];
    });
  };

  const removeItem = (productId: string, variantId?: string) => {
    setItems(prev => prev.filter(item => {
      if (item.product.id !== productId) return true;
      if (variantId) {
        return (item.selectedVariant?.id || 'no-variant') !== variantId;
      }
      return false;
    }));
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    
    setItems(prev => 
      prev.map(item => {
        if (item.product.id !== productId) return item;
        if (variantId && (item.selectedVariant?.id || 'no-variant') !== variantId) return item;
        return { ...item, quantity };
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const getItemCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => {
      // Use variant price if selected, otherwise use product price
      const itemPrice = item.selectedVariant?.price ?? item.product.price;
      return total + itemPrice * item.quantity;
    }, 0);
  };

  const getTotal = (deliveryFee = 0, discount = 0) => {
    return getSubtotal() + deliveryFee - discount;
  };

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getItemCount,
      getSubtotal,
      getTotal,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
