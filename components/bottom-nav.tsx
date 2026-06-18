"use client";

import Link from "next/link";
import { usePathname } from "next/navigation"; // ✅ Naya import
import { Home, UtensilsCrossed, ClipboardList, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  tableId: string;
}

export function BottomNav({ tableId }: BottomNavProps) {
  const pathname = usePathname();

  // ✅ JADU: Agar hum Welcome Page par hain, toh Bottom Nav mat dikhao
  if (pathname === `/table/${tableId}`) {
    return null;
  }

  // 👇 Yahan se tumhara purana code chalu hoga (maine assume kiya hai basic code yehi hoga)
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-3 flex justify-between items-center z-40 pb-safe">
      <Link href={`/table/${tableId}`} className="flex flex-col items-center gap-1">
        <Home className={cn("h-5 w-5", pathname === `/table/${tableId}` ? "text-orange-600" : "text-muted-foreground")} />
        <span className={cn("text-[10px] font-medium", pathname === `/table/${tableId}` ? "text-orange-600" : "text-muted-foreground")}>Home</span>
      </Link>
      
      <Link href={`/table/${tableId}/menu`} className="flex flex-col items-center gap-1">
        <UtensilsCrossed className={cn("h-5 w-5", pathname.includes('/menu') ? "text-orange-600" : "text-muted-foreground")} />
        <span className={cn("text-[10px] font-medium", pathname.includes('/menu') ? "text-orange-600" : "text-muted-foreground")}>Menu</span>
      </Link>

      <Link href={`/table/${tableId}/orders`} className="flex flex-col items-center gap-1">
        <ClipboardList className={cn("h-5 w-5", pathname.includes('/orders') ? "text-orange-600" : "text-muted-foreground")} />
        <span className={cn("text-[10px] font-medium", pathname.includes('/orders') ? "text-orange-600" : "text-muted-foreground")}>Orders</span>
      </Link>

      <Link href={`/table/${tableId}/pay`} className="flex flex-col items-center gap-1">
        <Receipt className={cn("h-5 w-5", pathname.includes('/pay') ? "text-orange-600" : "text-muted-foreground")} />
        <span className={cn("text-[10px] font-medium", pathname.includes('/pay') ? "text-orange-600" : "text-muted-foreground")}>Bill</span>
      </Link>
    </div>
  );
}