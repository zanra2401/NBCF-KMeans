import { container } from "@/di/container";
import { ItemListView } from "@/presentation/views/ItemListView";

export default async function ItemsPage() {
  const items = await container.useCases.getAllItems.execute();

  return <ItemListView items={items} />;
}
