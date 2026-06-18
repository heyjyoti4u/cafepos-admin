"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MenuItem, useCart, AddOn } from "@/lib/cart-context";
import { ItemCustomizationModal } from "./item-customization-modal";

interface AddToCartButtonProps {
  item: MenuItem;
}

export function AddToCartButton({ item }: AddToCartButtonProps) {
  const { items, addItem, removeItem } = useCart();
  const [showModal, setShowModal] = useState(false);

  const cartItem = items.find((i) => i.id === item.id);
  const quantity = cartItem?.quantity || 0;

  const handleModalAdd = (item: MenuItem, qty: number, addOns: AddOn[], cookingPreference?: string) => {
    for (let i = 0; i < qty; i++) {
      addItem({ ...item, addOns, instructions: cookingPreference });
    }
  };

  if (quantity === 0) {
    return (
      <>
        <Button
          onClick={() => setShowModal(true)}
          variant="outline"
          size="sm"
          className="text-orange-600 border-orange-600 hover:bg-orange-50 bg-white font-semibold px-6 rounded-lg"
        >
          ADD
        </Button>
        
        {showModal && (
          <ItemCustomizationModal 
            item={item} 
            onClose={() => setShowModal(false)} 
            onAddToCart={handleModalAdd}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg p-1">
      <button
        onClick={() => {
          // Find the last added instance of this item to remove
          const itemToRemove = [...items].reverse().find(i => i.id === item.id);
          if (itemToRemove) {
            removeItem(itemToRemove.cartItemId);
          }
        }}
        className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-orange-600 hover:bg-orange-100 font-medium"
      >
        -
      </button>
      <span className="font-semibold text-sm w-4 text-center">{quantity}</span>
      <button
        onClick={() => setShowModal(true)}
        className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-orange-600 hover:bg-orange-100 font-medium"
      >
        +
      </button>
      
      {showModal && (
        <ItemCustomizationModal 
          item={item} 
          onClose={() => setShowModal(false)} 
          onAddToCart={handleModalAdd}
        />
      )}
    </div>
  );
}
