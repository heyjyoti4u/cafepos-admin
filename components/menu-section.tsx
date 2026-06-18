"use client";

import { useState } from "react";
import { MenuItem } from "@/lib/cart-context";
import { MenuItemCard } from "./menu-item-card";
import { ChevronDown, ChevronUp } from "lucide-react";

// Naya interface jo 'title' aur 'items' lega (bina icon ke)
interface MenuSectionProps {
  title: string;
  items: any[]; // Tum chaho toh isko MenuItem[] kar sakte ho
  defaultExpanded?: boolean;
}

export function MenuSection({ title, items, defaultExpanded = true }: MenuSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-card rounded-lg overflow-hidden shadow-sm mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Icon yahan se hata diya gaya hai */}
          <h2 className="font-semibold text-foreground text-lg">{title}</h2>
          <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {items.length} items
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      
      {/* Items List */}
      {isExpanded && (
        <div className="px-4 pb-2 divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="py-2">
              <MenuItemCard item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}