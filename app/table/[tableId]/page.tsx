import { WelcomePageClient } from "@/components/welcome-page-client";

interface TablePageProps {
  params: Promise<{ tableId: string }>;
}

export default async function TablePage({ params }: TablePageProps) {
  const { tableId } = await params;
  return <WelcomePageClient tableId={tableId} />;
}

export function generateMetadata() {
  return {
    title: "Friends & Fries Cafe - Welcome",
    description: "Welcome to Friends & Fries Cafe",
  };
}
