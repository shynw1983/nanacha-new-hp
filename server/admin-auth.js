const { createHmac, timingSafeEqual } = require("crypto");

const cookieName = "nanacha_admin_session";
const maxAgeSeconds = 60 * 60 * 12;

const getSecret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
const getPassword = () => process.env.ADMIN_PASSWORD || "";

const sign = (value) => createHmac("sha256", getSecret()).update(value).digest("hex");

const createSessionValue = (user = {}) => {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.userId,
      loginId: user.loginId,
      displayName: user.displayName,
      role: user.role,
      storeIds: user.storeIds || [],
      exp: Date.now() + maxAgeSeconds * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
};

const getSession = (value = "") => {
  if (!value || !getSecret()) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (Number(decoded.exp) <= Date.now()) return null;
    if (!decoded.sub || !decoded.loginId || !decoded.role) return null;
    return {
      userId: decoded.sub || "",
      loginId: decoded.loginId || "",
      displayName: decoded.displayName || decoded.loginId || "",
      role: decoded.role || "staff",
      storeIds: Array.isArray(decoded.storeIds) ? decoded.storeIds : [],
    };
  } catch {
    return null;
  }
};

const getSessionFromCookieStore = (cookieStore) => getSession(cookieStore.get(cookieName)?.value);
const isValidSession = (value = "") => Boolean(getSession(value));

const canAccessAllStores = (session) => session?.role === "owner";
const hasStoreAccess = (session, storeId) => canAccessAllStores(session) || session?.storeIds?.includes(storeId);
const filterAccessibleStores = (session, stores = []) =>
  canAccessAllStores(session) ? stores : stores.filter((store) => session?.storeIds?.includes(store.id));

const canManageProducts = (session) => ["owner", "manager", "staff"].includes(session?.role);
const canManageProductCatalog = (session) => ["owner", "manager"].includes(session?.role);
const canManageStores = (session) => ["owner", "manager"].includes(session?.role);
const canManageStaff = (session) => session?.role === "owner";

module.exports = {
  cookieName,
  maxAgeSeconds,
  getPassword,
  createSessionValue,
  getSession,
  getSessionFromCookieStore,
  isValidSession,
  canAccessAllStores,
  hasStoreAccess,
  filterAccessibleStores,
  canManageProducts,
  canManageProductCatalog,
  canManageStores,
  canManageStaff,
};
