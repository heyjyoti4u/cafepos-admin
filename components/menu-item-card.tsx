"use client";

import { MenuItem } from "@/lib/cart-context";
import { AddToCartButton } from "./add-to-cart-button";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  // Logic: Agar is_veg explicitly 'false' nahi hai, toh use Veg (Green) mano
  // (item as any) use kiya hai taaki TypeScript error na de agar interface update nahi hai
  const isVeg = (item as any).is_veg !== false;

  return (
    <div className="flex items-start justify-between py-4 border-b border-border last:border-b-0">
      <div className="flex gap-3 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* 🟢 Veg / 🔴 Non-Veg Indicator Yahan Add Kiya */}
            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
              isVeg ? 'border-green-600' : 'border-red-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isVeg ? 'bg-green-600' : 'bg-red-600'
              }`} />
            </div>
            
            {/* Item Ka Naam */}
            <h3 className="font-medium text-foreground text-sm">{item.name}</h3>
          </div>
          
          <p className="text-sm font-semibold text-foreground mt-1">
            ₹{item.price}
          </p>
          
          {/* Item Category / Description */}
          {item.category && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {item.category}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex-shrink-0 ml-4">
        <AddToCartButton item={item} />
      </div>
    </div>
  );
}