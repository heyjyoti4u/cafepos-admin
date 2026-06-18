"use client";

import { useCart } from "@/lib/cart-context";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

interface CartFloatingButtonProps {
  tableId: string;
}

export function CartFloatingButton({ tableId }: CartFloatingButtonProps) {
  const { totalItems, totalAmount } = useCart();

  if (totalItems === 0) return null;

  return (
    <Link
      href={`/table/${tableId}/cart`}
      className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto z-20"
    >
      <div className="bg-primary text-primary-foreground rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag className="h-6 w-6" />
            <span className="absolute -top-2 -right-2 bg-primary-foreground text-primary text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {totalItems}
            </span>
          </div>
          <span className="font-medium">
            {totalItems} item{totalItems !== 1 && "s"} added
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">₹{totalAmount}</span>
          <span className="text-primary-foreground/80">→</span>
        </div>
      </div>
    </Link>
  );
}
