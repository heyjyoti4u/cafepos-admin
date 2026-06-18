"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/bottom-nav";
import {
  Clock,
  Check,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Loader2,
  Bell,
} from "lucide-react";
import { useState } from "react";

interface OrdersPageClientProps {
  tableId: string;
}

// ✅ Status config ek jagah — easy to update
const STATUS_CONFIG = {
  pending: {
    label: "Order Received",
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-muted/60",
    dot: "bg-muted-foreground",
  },
  confirmed: {
    label: "Confirmed ✓",
    icon: Check,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    dot: "bg-blue-500",
  },
  preparing: {
    label: "Being Prepared",
    icon: ChefHat,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    dot: "bg-amber-500",
  },
  ready: {
    label: "Ready to Serve! 🎉",
    icon: Bell,
    color: "text-green-500",
    bg: "bg-green-500/10",
    dot: "bg-green-500",
  },
  delivered: {
    label: "Order Delivered 🍽️",
    icon: Check,
    color: "text-green-600",
    bg: "bg-green-600/10",
    dot: "bg-green-600",
  },
} as const;

export function OrdersPageClient({ tableId }: OrdersPageClientProps) {
  const { orders, refreshOrderStatus } = useCart();
  const [expandedPastOrders, setExpandedPastOrders] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const prevStatusRef = useRef<Record<string, string>>({});

  // ─── Supabase Realtime: Live status listen karo ──────────────────────────
  useEffect(() => {
    if (orders.length === 0) return;

    const activeIds = orders
      .filter((o) => ["pending", "confirmed", "preparing"].includes(o.status))
      .map((o) => o.id);

    if (activeIds.length === 0) return;

    const channel = supabase
      .channel(`orders-page-${tableId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" },
        async (payload) => {
          const updated = payload.new as { id: string; status: string; payment_status: string };
          if (updated.payment_status === 'paid') {
            window.location.reload();
            return;
          }
          if (activeIds.includes(updated.id)) {
            await refreshOrderStatus(updated.id);
          }
        }
      )
      // order_items INSERT/DELETE pe bhi refresh karo (admin ne item add/remove kiya)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_items" },
        async (payload) => {
          const item = payload.new as { order_id: string };
          if (activeIds.includes(item.order_id)) {
            await refreshOrderStatus(item.order_id);
          }
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "order_items" },
        async (payload) => {
          const item = payload.old as { order_id: string };
          if (activeIds.includes(item.order_id)) {
            await refreshOrderStatus(item.order_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orders.map((o) => o.id).join(","), tableId]);

  // ─── Page visible hone par manual refresh (tab switch ke baad) ──────────
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        setIsRefreshing(true);
        const activeOrders = orders.filter((o) =>
          ["pending", "confirmed", "preparing"].includes(o.status)
        );
        await Promise.all(activeOrders.map((o) => refreshOrderStatus(o.id)));
        setIsRefreshing(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [orders, refreshOrderStatus]);

  // ─── Time helpers ─────────────────────────────────────────────────────────
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

  const formatTime = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
    return formatDate(date);
  };

  // ─── Order splits ─────────────────────────────────────────────────────────
  // ✅ Ab hum time-based filter nahi use karenge. 
  // Jo order 'paid' nahi hai, wo current orders mein dikhega.
  const currentOrders = orders.filter((o) => o.paymentStatus !== "paid");
  const pastOrders: any[] = []; // Past orders ab customer ko nahi dikhayenge kyunki payment ke baad clear ho jayenge.

  // ─── Status Badge Component ───────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: keyof typeof STATUS_CONFIG }) => {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </span>
    );
  };

  // ─── Animated progress bar for active orders ──────────────────────────────
  const StatusProgress = ({ status }: { status: string }) => {
    const steps = ["pending", "confirmed", "preparing", "ready", "served"];
    const current = steps.indexOf(status);
    return (
      <div className="flex items-center gap-1 mt-3">
        {steps.slice(0, 4).map((step, i) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= current ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-20">

      <div className="px-4 py-4">
        {/* ✅ Refreshing indicator */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Your Orders
          </h2>
          {isRefreshing && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating...
            </div>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-4xl">📋</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No orders yet
            </h3>
            <p className="text-muted-foreground text-center text-sm">
              Aapke placed orders yahan dikhenge
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Current Orders ── */}
            {currentOrders.map((order) => {
              const status = order.status as keyof typeof STATUS_CONFIG;
              return (
                <div
                  key={order.id}
                  className="bg-card rounded-xl p-4 border border-border"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <StatusBadge status={status} />
                    <span className="text-xs text-muted-foreground">
                      {formatTime(new Date(order.createdAt))}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {["pending", "confirmed", "preparing"].includes(
                    order.status
                  ) && <StatusProgress status={order.status} />}

                  {/* Customer name */}
                  <p className="text-sm text-muted-foreground mt-3 mb-2">
                    Customer:{" "}
                    <span className="text-foreground font-medium">
                      {order.customerName}
                    </span>
                  </p>

                  {/* Items */}
                  <div className="space-y-1.5 mb-3">
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {/* ✅ isVeg safe check */}
                          <div
                            className={`w-3 h-3 border flex-shrink-0 ${
                              item.isVeg
                                ? "border-green-600"
                                : "border-red-600"
                            } flex items-center justify-center`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.isVeg ? "bg-green-600" : "bg-red-600"
                              }`}
                            />
                          </div>
                          <span className="text-muted-foreground">
                            {item.quantity}× {item.name}
                          </span>
                        </div>
                        <span className="text-foreground">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between pt-3 border-t border-border">
                    <span className="font-medium text-foreground text-sm">
                      Total
                    </span>
                    <span className="font-semibold text-foreground">
                      ₹{order.grandTotal}
                    </span>
                  </div>

                  {/* ✅ Payment Request Message */}
                  {order.status === 'delivered' && order.paymentStatus !== 'paid' && (
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-lg animate-pulse">
                      <p className="text-xs text-orange-800 font-medium text-center">
                        Hope you enjoyed your meal! ❤️ <br/>
                        Please make the payment at the counter.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Past Orders ── */}
            {pastOrders.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setExpandedPastOrders(!expandedPastOrders)}
                  className="flex items-center justify-between w-full py-3 text-sm font-medium text-muted-foreground"
                >
                  <span>Purane Orders ({pastOrders.length})</span>
                  {expandedPastOrders ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {expandedPastOrders && (
                  <div className="space-y-3">
                    {pastOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-muted/50 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            {order.customerName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(new Date(order.createdAt))}
                          </span>
                        </div>
                        <div className="space-y-1 mb-2">
                          {order.items.map((item: any, i: number) => (
                            <div
                              key={i}
                              className="flex justify-between text-xs text-muted-foreground"
                            >
                              <span>
                                {item.quantity}× {item.name}
                              </span>
                              <span>₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between pt-2 border-t border-border/50">
                          <span className="text-sm font-medium text-foreground">
                            Total
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            ₹{order.grandTotal}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav tableId={tableId} />
    </div>
  );
}