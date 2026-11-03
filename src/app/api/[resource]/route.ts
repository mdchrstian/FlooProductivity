import { NextRequest } from "next/server";
import { mutate } from "@/lib/mutations";
type Context = { params: Promise<{ resource: string }> };
export async function POST(r: NextRequest, c: Context) {
  return mutate(r, (await c.params).resource);
}
export async function PATCH(r: NextRequest, c: Context) {
  return mutate(r, (await c.params).resource);
}
