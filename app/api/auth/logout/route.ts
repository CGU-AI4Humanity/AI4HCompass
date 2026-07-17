import { revokeSession } from "@/lib/auth";
import { apiErrorResponse, assertSameOrigin, json } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const cookie = await revokeSession(request);
    return json({ success: true }, { headers: { "Set-Cookie": cookie } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
