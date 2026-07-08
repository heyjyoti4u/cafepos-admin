"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Receipt, CheckCircle, Clock, ChefHat } from "lucide-react";

export default function DigitalReceiptPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;
      
      const { data, error } = await supabase
        .from("orders")
        .select(`*, order_items(*)`)
        .eq("id", orderId)
        .single();

      if (error) {
        console.error("Bill fetch error:", error);
      } else {
        setOrder(data);
      }
      setLoading(false);
    };

    fetchOrderDetails();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <Receipt className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-800">Bill Not Found</h1>
        <p className="text-gray-500 mt-2">The link might be broken or the order doesn't exist.</p>
      </div>
    );
  }

  const orderDate = new Date(order.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4 font-sans">
      
      {/* Bill Container */}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header - Brand */}
        <div className="bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400" />
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
            <ChefHat className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-widest uppercase">Cafe Cookies</h1>
          <p className="text-slate-400 text-sm mt-1">Surat, Gujarat</p>
        </div>

        {/* Order Info */}
        <div className="px-6 py-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Token No.</p>
            <p className="text-2xl font-black text-orange-600">#{order.table_number}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Status</p>
            {order.payment_status === "paid" ? (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                <CheckCircle className="w-3.5 h-3.5" /> PAID
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                <Clock className="w-3.5 h-3.5" /> UNPAID
              </span>
            )}
          </div>
        </div>

        {/* Customer & Date */}
        <div className="px-6 py-4 border-b border-gray-100 border-dashed text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-gray-500">Customer:</span>
            <span className="font-semibold text-gray-800 capitalize">{order.customer_name || 'Guest'}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-500">Mobile:</span>
            <span className="font-semibold text-gray-800">+91 {order.phone_number || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Date:</span>
            <span className="font-semibold text-gray-800">{orderDate}</span>
          </div>
        </div>

        {/* Items */}
        <div className="px-6 py-5">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-4 border-b border-gray-200 pb-2">Order Summary</p>
          
          <div className="space-y-4">
            {order.order_items?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start text-sm">
                <div className="flex-1 pr-4">
                  <p className="font-semibold text-gray-800">
                    <span className="text-orange-500 mr-2">{item.quantity}x</span>
                    {item.item_name}
                  </p>
                  {item.add_ons && item.add_ons.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">
                      + {item.add_ons.map((a: any) => a.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="font-semibold text-gray-800">
                  ₹{item.item_price * item.quantity}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-slate-50 px-6 py-5 border-t border-gray-200 border-dashed">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-bold uppercase tracking-wider">Grand Total</span>
            <span className="text-2xl font-black text-gray-900">₹{order.total_amount}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4 text-center">
          <p className="text-xs text-gray-400 font-medium">Thank you for dining with us!</p>
          <p className="text-[10px] text-gray-400 mt-1 font-mono">Order ID: {order.id.slice(0, 10).toUpperCase()}</p>
        </div>

      </div>
    </div>
  );
}