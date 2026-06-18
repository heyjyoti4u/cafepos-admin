"use client";

import { Users } from "lucide-react"; 
import Image from "next/image"; 
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation"; // ✅ Naya import

interface HeaderProps {
  tableNumber: string;
}

export function Header({ tableNumber }: HeaderProps) {
  const pathname = usePathname(); // ✅ Current page ka link check karega

  // ✅ JADU: Agar hum Welcome Page par hain, toh Header mat dikhao (return null)
  if (pathname === `/table/${tableNumber}`) {
    return null;
  }

  return (
    <header className="bg-orange-600 text-white px-4 py-3 sticky top-0 z-30 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-orange-400">
            <Image 
              src="/cafelogo1.jpeg" 
              alt="Cafe Cookies Logo" 
              width={44} 
              height={44} 
              className="object-cover w-full h-full"
            />
          </div>

          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">
              Cafe Cookies
            </h1>
            <p className="text-xs text-white/90 font-medium">
              Table {tableNumber}
            </p>
          </div>
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          className="gap-2 bg-white/20 text-white hover:bg-white/30 border-0 rounded-full px-4"
        >
          <Users className="h-4 w-4" />
          <span className="text-sm font-medium hidden sm:inline">Group Order</span>
        </Button>
      </div>
    </header>
  );
}