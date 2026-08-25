import { PackEditor } from "@/components/PackEditor";

export default async function PackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PackEditor packId={id} />;
}
