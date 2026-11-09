import { notFound } from "next/navigation";
import { WorkspaceView } from "@/components/workspace";
const pages = [
  "dashboard",
  "daily",
  "academic",
  "calendar",
  "settings",
  "notes",
  "focus",
  "committee",
];
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!pages.includes(section)) notFound();
  return <WorkspaceView section={section} />;
}
