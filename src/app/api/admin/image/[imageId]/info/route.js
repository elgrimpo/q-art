import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getBackendToken } from "@/_utils/backendAuth";

function isAdminEmail(email) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { imageId } = params;
  const token = await getBackendToken();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/image/${imageId}/info`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    return new Response("Not found", { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
}
