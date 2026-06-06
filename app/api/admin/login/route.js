const { cookieName, maxAgeSeconds, createSessionValue } = require("../../../../server/admin-auth");
const { authenticateAdminUser } = require("../../../../server/admin-users");

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const user = await authenticateAdminUser({
    loginId: body.loginId,
    password: body.password,
  });

  if (!user) {
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = Response.json({ ok: true, user });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `${cookieName}=${createSessionValue(user)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`,
  );
  return response;
}
