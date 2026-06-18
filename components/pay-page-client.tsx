"use client";

import { useCart } from "@/lib/cart-context";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { Receipt, Info } from "lucide-react";

interface PayPageClientProps {
  tableId: string;
}

export function PayPageClient({ tableId }: PayPageClientProps) {
  const { orders } = useCart();
  
  // Calculate total from all orders
  const totalFromOrders = orders.reduce((sum, order) => sum + order.grandTotal, 0);
  const subtotalFromOrders = orders.reduce((sum, order) => sum + order.total, 0);
  const taxFromOrders = orders.reduce((sum, order) => sum + order.tax, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header tableNumber={tableId} />
      
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Bill Summary</h2>
            <p className="text-sm text-muted-foreground">
              Table {tableId}
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-card rounded-lg p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No orders yet</h3>
            <p className="text-sm text-muted-foreground">
              Place an order to see your bill here
            </p>
          </div>
        ) : (
          <>
            {/* Order Items Breakdown */}
            <div className="bg-card rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-foreground mb-3">Order Details</h3>
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>{order.customerName}</span>
                      <span>Order #{order.id.slice(-4)}</span>
                    </div>
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-foreground">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Summary */}
            <div className="bg-card rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-foreground mb-3">Bill Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">₹{subtotalFromOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (5%)</span>
                  <span className="text-foreground">₹{taxFromOrders}</span>
                </div>
                <div className="h-px bg-border my-3" />
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-foreground">Total Amount</span>
                  <span className="text-primary">₹{totalFromOrders}</span>
                </div>
              </div>
            </div>

            {/* Info Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Payment at Counter</p>
                <p className="text-xs text-amber-700 mt-1">
                  Please pay your bill at the billing counter. Show this screen for your order total.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav tableId={tableId} />
    </div>
  );
}
