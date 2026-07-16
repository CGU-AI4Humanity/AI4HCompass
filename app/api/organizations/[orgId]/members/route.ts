import { all, first, run } from "@/db";
import { normalizeEmail, requireUser, sendOrganizationInvitation } from "@/lib/auth";
import { requireOrgRole } from "@/lib/access";
import { ApiError, apiErrorResponse, assertSameOrigin, json } from "@/lib/http";
import type { OrganizationRole } from "@/shared/types";
import { z } from "zod";

type Context = { params: Promise<{ orgId: string }> };
const inviteSchema = z.object({ email: z.string().trim().email().max(254), role: z.enum(["admin", "assessor", "viewer"]) });
const roleSchema = z.object({ userId: z.string().uuid(), role: z.enum(["admin", "assessor", "viewer"]) });
const removeSchema = z.object({ userId: z.string().uuid() });

async function guardLastAdmin(orgId: string, targetUserId: string, nextRole?: OrganizationRole) {
  const target = await first<{ role: OrganizationRole }>("SELECT role FROM memberships WHERE org_id = ? AND user_id = ?", orgId, targetUserId);
  if (target?.role !== "admin" || nextRole === "admin") return;
  const count = await first<{ count: number }>("SELECT COUNT(*) AS count FROM memberships WHERE org_id = ? AND role = 'admin'", orgId);
  if ((count?.count ?? 0) <= 1) throw new ApiError(400, "Every organization must keep at least one admin.");
}

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    const { orgId } = await context.params;
    await requireOrgRole(user.id, orgId, "viewer");
    const members = await all<{ id: string; email: string; role: OrganizationRole; status: "active" }>(
      `SELECT u.id, u.email, m.role, 'active' AS status FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? ORDER BY m.role, u.email`,
      orgId,
    );
    const invitations = await all<{ id: string; email: string; role: OrganizationRole; status: "invited" }>(
      `SELECT id, email, role, 'invited' AS status FROM invitations WHERE org_id = ? AND accepted_at IS NULL AND expires_at > ? ORDER BY created_at DESC`,
      orgId,
      new Date().toISOString(),
    );
    return json({ members: [...members, ...invitations] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { orgId } = await context.params;
    await requireOrgRole(user.id, orgId, "admin");
    const { email: rawEmail, role } = inviteSchema.parse(await request.json());
    const email = normalizeEmail(rawEmail);
    const organization = await first<{ name: string }>("SELECT name FROM organizations WHERE id = ?", orgId);
    if (!organization) throw new ApiError(404, "Organization not found.");
    const existingUser = await first<{ id: string }>("SELECT id FROM users WHERE email = ?", email);
    if (existingUser) {
      await run(
        "INSERT INTO memberships (org_id, user_id, role) VALUES (?, ?, ?) ON CONFLICT(org_id, user_id) DO UPDATE SET role = excluded.role",
        orgId,
        existingUser.id,
        role,
      );
    } else {
      await run("DELETE FROM invitations WHERE org_id = ? AND email = ? AND accepted_at IS NULL", orgId, email);
      await run(
        "INSERT INTO invitations (id, org_id, email, role, token_hash, expires_at, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
        crypto.randomUUID(),
        orgId,
        email,
        role,
        crypto.randomUUID(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        user.id,
      );
    }
    await sendOrganizationInvitation(email, organization.name);
    return json({ success: true }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { orgId } = await context.params;
    await requireOrgRole(user.id, orgId, "admin");
    const { userId, role } = roleSchema.parse(await request.json());
    await guardLastAdmin(orgId, userId, role);
    const result = await run("UPDATE memberships SET role = ? WHERE org_id = ? AND user_id = ?", role, orgId, userId);
    if (!result.meta.changes) throw new ApiError(404, "Member not found.");
    return json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { orgId } = await context.params;
    await requireOrgRole(user.id, orgId, "admin");
    const { userId } = removeSchema.parse(await request.json());
    await guardLastAdmin(orgId, userId);
    await run("DELETE FROM memberships WHERE org_id = ? AND user_id = ?", orgId, userId);
    return json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
