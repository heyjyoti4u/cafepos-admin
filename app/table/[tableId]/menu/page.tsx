import { MenuPageClient } from "@/components/menu-page-client";

interface MenuPageProps {
  params: Promise<{ tableId: string }>;
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { tableId } = await params;
  return <MenuPageClient tableId={tableId} />;
}
