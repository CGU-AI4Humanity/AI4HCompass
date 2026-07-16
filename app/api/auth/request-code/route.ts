import { requestSignInCode } from "@/lib/auth";
import { apiErrorResponse, assertSameOrigin, json } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ email: z.string().trim().email().max(254) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { email } = schema.parse(await request.json());
    const result = await requestSignInCode(request, email);
    return json({ success: true, message: "If the address can receive email, a code is on its way.", ...result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
