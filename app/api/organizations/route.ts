import { all, first, run } from "@/db";
import { requireUser } from "@/lib/auth";
import { apiErrorResponse, assertSameOrigin, json } from "@/lib/http";
import type { OrganizationSummary } from "@/shared/types";
import { z } from "zod";

const createSchema = z.object({ name: z.string().trim().min(2).max(100) });

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "organization";
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const organizations = await all<OrganizationSummary>(
      `SELECT o.id, o.name, o.slug, m.role FROM organizations o JOIN memberships m ON m.org_id = o.id WHERE m.user_id = ? ORDER BY o.name`,
      user.id,
    );
    return json({ organizations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { name } = createSchema.parse(await request.json());
    let slug = slugify(name);
    if (await first("SELECT id FROM organizations WHERE slug = ?", slug)) slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await run("INSERT INTO organizations (id, name, slug, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", id, name, slug, user.id, now, now);
    await run("INSERT INTO memberships (org_id, user_id, role) VALUES (?, ?, 'admin')", id, user.id);
    return json({ organization: { id, name, slug, role: "admin" } }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
