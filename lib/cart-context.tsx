"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface AddOn {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  image_url?: string;
  isVeg?: boolean;
}

export interface CartItem extends MenuItem {
  cartItemId: string; // ✅ NAYA: Har cart item ka apna unique ID (Customizations alag rakhne ke liye)
  quantity: number;
  addOns?: AddOn[];
  instructions?: string;
}

export interface Order {
  id: string;
  customerName: string;
  items: CartItem[];
  total: number;
  tax: number;
  grandTotal: number;
  status: "pending" | "confirmed" | "preparing" | "ready" | "served" | "delivered";
  paymentStatus: "pending" | "paid";
  paymentMethod?: "cash" | "online";
  createdAt: Date;
}

interface CartContextType {
  items: CartItem[];
  // ✅ addItem ko update kiya taaki wo addOns aur instructions le sake
  addItem: (item: MenuItem & { addOns?: AddOn[]; instructions?: string }) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
  orders: Order[];
  placeOrder: (tableId: string, customerName: string, orderNotes?: string) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  refreshOrderStatus: (orderId: string) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
  // Check if we are actually in the browser
  if (typeof window === "undefined") return;

  let sid = localStorage.getItem("cafe_session_id");
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).substring(2, 15) + Date.now();
    localStorage.setItem("cafe_session_id", sid);
  }
  setSessionId(sid);
}, []);

  useEffect(() => {
    if (!sessionId) return;
    const fetchSessionOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("session_id", sessionId)
        .neq("payment_status", "paid") // ✅ NAYA: Paid orders customer ko mat dikhao
        .order("created_at", { ascending: false });

      if (data && !error) {
        const formatted: Order[] = data.map((dbOrder: any) => ({
          id: dbOrder.id,
          customerName: dbOrder.customer_name,
          total: dbOrder.total_amount,
          tax: 0,
          grandTotal: dbOrder.total_amount,
          status: dbOrder.status,
          paymentStatus: dbOrder.payment_status || "pending",
          paymentMethod: dbOrder.payment_method,
          createdAt: new Date(dbOrder.created_at),
          items: (dbOrder.order_items || []).map((item: any) => ({
            id: item.item_id, // DB wala original item ID
            cartItemId: item.id,
            name: item.item_name,
            price: item.item_price,
            quantity: item.quantity,
            addOns: item.add_ons || [],
            instructions: item.instructions || "",
          })),
        }));
        setOrders(formatted);
      }
    };
    fetchSessionOrders();
  }, [sessionId]);

  useEffect(() => {
    if (orders.length === 0) return;
    const activeIds = orders.filter((o) => ["pending", "confirmed", "preparing", "ready"].includes(o.status)).map((o) => o.id);
    if (activeIds.length === 0) return;

    const channel = supabase.channel("order-status-updates-" + activeIds[0])
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
          const updated = payload.new as { id: string; status: Order["status"] };
          if (activeIds.includes(updated.id)) {
            setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, status: updated.status } : o));
          }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orders.map((o) => o.id).join(",")]);

  // ─── ✅ SMART ADD ITEM (Same item with different add-ons handled separately) ───
  const addItem = (item: MenuItem & { addOns?: AddOn[]; instructions?: string }) => {
    setItems((prev) => {
      // Check karo kya EXACT same customization wala item cart mein already hai?
      const existing = prev.find(
        (i) =>
          i.id === item.id &&
          JSON.stringify(i.addOns || []) === JSON.stringify(item.addOns || []) &&
          i.instructions === item.instructions
      );

      if (existing) {
        return prev.map((i) => i.cartItemId === existing.cartItemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      
      // Naya combination hai toh naya unique cartItemId do
      // Date.now() ke saath random string add kar rahe hain taaki collision na ho
      const cartItemId = `${item.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return [...prev, { ...item, cartItemId, quantity: 1 }];
    });
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.cartItemId === cartItemId);
      if (existing && existing.quantity > 1) {
        return prev.map((i) => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter((i) => i.cartItemId !== cartItemId);
    });
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
    } else {
      setItems((prev) => prev.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i)));
    }
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const totalAmount = items.reduce((sum, item) => {
    const addOnsTotal = item.addOns?.reduce((a, b) => a + b.price, 0) || 0;
    return sum + (item.price + addOnsTotal) * item.quantity;
  }, 0);

  const refreshOrderStatus = useCallback(async (orderId: string) => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, status, total_amount, payment_status, order_items(*)")
      .eq("id", orderId)
      .single();
    if (!error && data) {
      const items = (data.order_items || []).map((item: any) => ({
        id: item.item_id,
        cartItemId: item.id,
        name: item.item_name,
        price: item.item_price,
        quantity: item.quantity,
        addOns: item.add_ons || [],
        instructions: item.instructions || "",
      }));
      setOrders((prev) => prev.map((o) => o.id === data.id ? {
        ...o,
        status: data.status,
        paymentStatus: data.payment_status,
        total: data.total_amount,
        grandTotal: data.total_amount,
        items,
      } : o));
    }
  }, []);

  const placeOrder = async (tableId: string, customerName: string, orderNotes?: string) => {
    if (items.length === 0) return { success: false, error: "Cart is empty" };
    const tax = Math.round(totalAmount * 0.05);
    const grandTotal = totalAmount + tax;

    try {
      const { data: orderData, error: orderError } = await supabase.from("orders").insert([{
          table_number: tableId,
          customer_name: customerName || "Guest",
          total_amount: grandTotal,
          status: "pending",
          payment_status: "pending",
          session_id: sessionId,
          customer_notes: orderNotes || "",
      }]).select().single();

      if (orderError) throw orderError;

      const orderItemsInsert = items.map((cartItem) => {
        const addOnsTotal = cartItem.addOns?.reduce((a, b) => a + b.price, 0) || 0;
        return {
          order_id: orderData.id,
          item_id: cartItem.id, // Original product ID
          item_name: cartItem.name,
          item_price: cartItem.price + addOnsTotal, 
          quantity: cartItem.quantity,
          add_ons: cartItem.addOns || [],            
          instructions: cartItem.instructions || "", 
        };
      });

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsInsert);
      if (itemsError) throw itemsError;

      const newOrder: Order = {
        id: orderData.id,
        customerName: customerName || "Guest",
        items: [...items],
        total: totalAmount,
        tax,
        grandTotal,
        status: "pending",
        paymentStatus: "pending",
        createdAt: new Date(),
      };
      setOrders((prev) => [newOrder, ...prev]);
      clearCart();
      return { success: true, orderId: orderData.id };
    } catch (error: any) {
      return { success: false, error: error?.message || "Order place nahi ho saka. Dobara try karo." };
    }
  };

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalAmount, orders, placeOrder, refreshOrderStatus }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
