"use client";

import Link from "next/link";
import Image from "next/image"; // Naya Next.js Image import kiya
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react"; // Purana Cookie icon hata diya

interface WelcomePageClientProps {
  tableId: string;
}

export function WelcomePageClient({ tableId }: WelcomePageClientProps) {
  return (
    <div className="min-h-screen bg-[#FDF8F6] relative overflow-hidden flex items-center justify-center">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 right-10 w-40 h-40 rounded-full border-2 border-orange-600/10" />
        <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full border-2 border-orange-600/10" />
      </div>

      {/* Main card */}
      <div className="relative z-10 bg-white rounded-2xl shadow-lg p-8 mx-4 max-w-sm w-full text-center">
        
        {/* 📸 NAYA REAL LOGO YAHAN AAYEGA */}
        <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center shadow-md overflow-hidden bg-white border-4 border-orange-50">
          <Image 
            src="/cafelogo1.jpeg" 
            alt="Cafe Cookies Logo" 
            width={96} 
            height={96} 
            className="object-cover w-full h-full"
            priority // Ise priority di hai taaki page load hote hi sabse pehle logo dikhe
          />
        </div>
        
        {/* Restaurant name */}
        <h1 className="text-2xl font-bold text-slate-800 mb-1">
          Cafe Cookies
        </h1>
        <p className="text-sm text-slate-500 mb-6 font-medium">
          Welcome to Table {tableId}
        </p>
        
        {/* Order button */}
        <Link href={`/table/${tableId}/menu`}>
          <Button className="w-full gap-2 h-12 text-base font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl">
            Order Now
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}