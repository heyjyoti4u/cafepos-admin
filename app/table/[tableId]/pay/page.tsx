import { PayPageClient } from "@/components/pay-page-client";

interface PayPageProps {
  params: Promise<{ tableId: string }>;
}

export default async function PayPage({ params }: PayPageProps) {
  const { tableId } = await params;
  return <PayPageClient tableId={tableId} />;
}

export function generateMetadata() {
  return {
    title: "Pay Bill - Friends & Fries Cafe",
    description: "Complete your payment",
  };
}
