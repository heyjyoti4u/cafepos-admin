import { CartPageClient } from "@/components/cart-page-client";

interface CartPageProps {
  params: Promise<{ tableId: string }>;
}

export default async function CartPage({ params }: CartPageProps) {
  const { tableId } = await params;
  return <CartPageClient tableId={tableId} />;
}

export function generateMetadata() {
  return {
    title: "Your Cart - Cafe Cookies", // ✅ Naya brand name update kar diya
    description: "Review your order before placing",
  };
}