import { NextResponse } from "next/server";
import { getServiceToken } from "@/_utils/backendAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  let email;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: "InvalidRequest" }, { status: 400 });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "InvalidEmail" }, { status: 400 });
  }

  let token;
  try {
    token = await getServiceToken();
  } catch {
    return NextResponse.json({ error: "ServiceUnavailable" }, { status: 500 });
  }
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/request-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ error: body.detail || "RequestFailed" }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
