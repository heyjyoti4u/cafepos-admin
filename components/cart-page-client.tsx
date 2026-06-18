"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Minus, Plus, Trash2, ArrowLeft,
  Check, User, Loader2, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CartPageClientProps {
  tableId: string;
}

export function CartPageClient({ tableId }: CartPageClientProps) {
  const { items, updateQuantity, totalAmount, clearCart, placeOrder } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [orderNotes, setOrderNotes] = useState(""); // ✅ Added orderNotes state
  const [showNameInput, setShowNameInput] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const router = useRouter();

  // Empty cart screen
  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
            <span className="text-4xl">🛒</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Your cart is empty
          </h2>
          <p className="text-muted-foreground text-center mb-6">
            Add some delicious items from our menu
          </p>
          <Link href={`/table/${tableId}/menu`}>
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Browse Menu
            </Button>
          </Link>
        </div>
        <BottomNav tableId={tableId} />
      </div>
    );
  }

  const tax = Math.round(totalAmount * 0.05);
  const grandTotal = totalAmount + tax;

  const handlePlaceOrder = async () => {
    if (!showNameInput) {
      setShowNameInput(true);
      return;
    }
    if (customerName.trim().length < 2) return;

    setIsOrdering(true);
    setOrderError(null);

    try {
      // ✅ Passed orderNotes to placeOrder
      const result = await placeOrder(tableId, customerName.trim(), orderNotes.trim());
      
      if (result.success) {
        setOrderSuccess(true);
        setTimeout(() => router.push(`/table/${tableId}/orders`), 800);
      } else {
        setOrderError(result.error || "Order place nahi ho saka. Dobara try karo.");
        setIsOrdering(false);
      }
    } catch {
      setOrderError("Network error. Internet check karo aur dobara try karo.");
      setIsOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-48">
      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Your Order ({items.length} item{items.length !== 1 && "s"})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            disabled={isOrdering}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        </div>

        {/* Error Banner */}
        {orderError && (
          <div className="mb-4 flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{orderError}</span>
          </div>
        )}

        {/* Cart Items */}
        <div className="bg-card rounded-lg divide-y divide-border">
          {items.map((item) => {
            // ✅ Per-item addOns total
            const addOnsTotal = item.addOns?.reduce((a, b) => a + b.price, 0) || 0;
            const unitPrice = item.price + addOnsTotal;

            return (
              <div key={item.cartItemId} className="p-4">   
               <div className="flex items-start justify-between gap-3">
                  {/* Left: veg indicator + name + addons */}
                  <div className="flex gap-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      <div
                        className={`w-4 h-4 border-2 ${
                          item.isVeg !== false
                            ? "border-green-600"
                            : "border-red-600"
                        } flex items-center justify-center`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            item.isVeg !== false
                              ? "bg-green-600"
                              : "bg-red-600"
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground text-sm">
                        {item.name}
                      </h3>
                      {/* ✅ AddOns list */}
                      {item.addOns && item.addOns.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          + {item.addOns.map((a) => a.name).join(", ")}
                        </p>
                      )}
                      {/* ✅ Per-item instructions */}
                      {item.instructions && (
                        <p className="text-[11px] text-amber-600 mt-0.5 italic truncate">
                          Note: {item.instructions}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-0.5">
                        ₹{unitPrice} each
                      </p>
                    </div>
                  </div>

                  {/* Right: qty controls + line total */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 bg-muted rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isOrdering}
                        onClick={() =>
                          updateQuantity(item.cartItemId, item.quantity - 1) // ✅ Fixed: using cartItemId
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 text-center font-semibold text-sm">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isOrdering}
                        onClick={() =>
                          updateQuantity(item.cartItemId, item.quantity + 1) // ✅ Fixed: using cartItemId
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-semibold text-foreground text-sm">
                      ₹{unitPrice * item.quantity}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bill Details */}
        <div className="mt-4 bg-card rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-3">Bill Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Total</span>
              <span className="text-foreground">₹{totalAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxes (5%)</span>
              <span className="text-foreground">₹{tax}</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between font-semibold">
              <span className="text-foreground">Grand Total</span>
              <span className="text-foreground">₹{grandTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-card border-t border-border space-y-3">
        {showNameInput && (
          <div className="space-y-2"> {/* ✅ Gap between name and textarea */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Apna naam daalo"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setOrderError(null);
                }}
                className="pl-10"
                autoFocus
                disabled={isOrdering}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePlaceOrder();
                }}
              />
            </div>
            
            {/* ✅ Textarea for Cooking Instructions added */}
            <textarea
              placeholder="Any cooking instructions? (e.g., Less spicy, extra ice)"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              disabled={isOrdering}
              className="w-full text-sm p-3 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              rows={2}
            />
          </div>
        )}

        <Button
          className="w-full h-12 text-base font-semibold gap-2"
          onClick={handlePlaceOrder}
          disabled={
            isOrdering ||
            orderSuccess ||
            (showNameInput && customerName.trim().length < 2)
          }
        >
          {orderSuccess ? (
            <><Check className="h-5 w-5" /> Order Placed! Redirecting...</>
          ) : isOrdering ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Placing Order...</>
          ) : showNameInput ? (
            `Confirm Order — ₹${grandTotal}`
          ) : (
            `Place Order — ₹${grandTotal}`
          )}
        </Button>
      </div>

      <BottomNav tableId={tableId} />
    </div>
  );
}