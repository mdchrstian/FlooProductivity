import { NextRequest } from "next/server";
import { mutate } from "@/lib/mutations";
type Context = { params: Promise<{ resource: string; id: string }> };
export async function PATCH(r: NextRequest, c: Context) {
  const p = await c.params;
  return mutate(r, p.resource, p.id);
}
export async function DELETE(r: NextRequest, c: Context) {
  const p = await c.params;
  return mutate(r, p.resource, p.id);
}
