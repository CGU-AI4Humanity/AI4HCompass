import { currentUser } from "@/lib/auth";
import { apiErrorResponse, json } from "@/lib/http";

export async function GET(request: Request) {
  try {
    return json({ user: await currentUser(request) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
