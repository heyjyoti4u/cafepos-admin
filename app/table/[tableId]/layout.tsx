// layout.tsx (Server Component)
import { ReactNode } from "react";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { GeofenceGuard } from "@/components/geofence-guard"; 

interface TableLayoutProps {
  children: ReactNode;
  params: Promise<{ tableId: string }>;
}

export default async function TableLayout({
  children,
  params,
}: TableLayoutProps) {
  const { tableId } = await params;

  return (
    // Wrap with the wrapper component instead of CartProvider directly
    <CartProviderWrapper>
      <GeofenceGuard>
        <div className="min-h-screen bg-background text-foreground">
          <Header tableId={tableId} />
          <main className="max-w-md mx-auto pb-20">{children}</main>
          <BottomNav tableId={tableId} />
        </div>
      </GeofenceGuard>
    </CartProviderWrapper>
  );
}
