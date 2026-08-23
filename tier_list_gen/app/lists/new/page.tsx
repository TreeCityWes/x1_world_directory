import { NewListForm } from "@/components/NewListForm";

export default async function NewListPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  const { pack } = await searchParams;
  return <NewListForm presetPack={pack ?? ""} />;
}
