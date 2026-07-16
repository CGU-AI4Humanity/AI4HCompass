import { verifySignInCode } from "@/lib/auth";
import { apiErrorResponse, assertSameOrigin, json } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ email: z.string().trim().email().max(254), code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { email, code } = schema.parse(await request.json());
    const result = await verifySignInCode(request, email, code);
    return json({ user: result.user }, { headers: { "Set-Cookie": result.cookie } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
