import { notFound } from "next/navigation";
import { container } from "@/di/container";
import { EntityNotFoundError } from "@/domain/errors/domain.error";
import { ItemDetailView } from "@/presentation/views/ItemDetailView";

export async function generateStaticParams() {
  const items = await container.useCases.getAllItems.execute();
  return items.map((item) => ({
    id: item.id,
  }));
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const item = await container.useCases.getItemById.execute({ id });
    return <ItemDetailView item={item} />;
  } catch (error) {
    if (error instanceof EntityNotFoundError) {
      notFound();
    }
    throw error;
  }
}
