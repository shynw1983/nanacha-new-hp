const { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } = require("crypto");
const { getPassword } = require("./admin-auth");

let sqlClientPromise;
let schemaReady = false;

const roles = new Set(["owner", "manager", "staff"]);

const getSql = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!sqlClientPromise) {
    sqlClientPromise = import("@neondatabase/serverless").then(({ neon }) => neon(process.env.DATABASE_URL));
  }

  return sqlClientPromise;
};

const ensureAdminUserSchema = async () => {
  if (schemaReady) return;
  const sql = await getSql();
  await sql`
    create table if not exists admin_users (
      user_id text primary key,
      login_id text not null unique,
      display_name text not null,
      role text not null check (role in ('owner', 'manager', 'staff')),
      password_hash text not null,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists admin_user_stores (
      user_id text not null references admin_users(user_id) on delete cascade,
      store_id text not null,
      primary key (user_id, store_id)
    )
  `;
  await sql`create index if not exists admin_user_stores_store_idx on admin_user_stores (store_id)`;
  schemaReady = true;
};

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  const iterations = 210000;
  const digest = "sha256";
  const hash = pbkdf2Sync(password, salt, iterations, 32, digest).toString("hex");
  return `pbkdf2$${digest}$${iterations}$${salt}$${hash}`;
};

const verifyPassword = (password, encoded = "") => {
  const [scheme, digest, iterations, salt, hash] = encoded.split("$");
  if (scheme !== "pbkdf2" || !digest || !iterations || !salt || !hash) return false;
  const nextHash = pbkdf2Sync(password, salt, Number(iterations), Buffer.from(hash, "hex").length, digest).toString("hex");
  if (nextHash.length !== hash.length) return false;
  return timingSafeEqual(Buffer.from(nextHash, "hex"), Buffer.from(hash, "hex"));
};

const normalizeUser = (row) => ({
  userId: row.user_id,
  loginId: row.login_id,
  displayName: row.display_name,
  role: row.role,
  isActive: row.is_active,
  storeIds: Array.isArray(row.store_ids) ? row.store_ids.filter(Boolean) : [],
  createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
  updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : "",
});

const listAdminUsers = async () => {
  await ensureAdminUserSchema();
  const sql = await getSql();
  const rows = await sql`
    select
      u.*,
      coalesce(array_agg(s.store_id order by s.store_id) filter (where s.store_id is not null), '{}') as store_ids
    from admin_users u
    left join admin_user_stores s on s.user_id = u.user_id
    group by u.user_id
    order by u.created_at asc
  `;
  return rows.map(normalizeUser);
};

const countAdminUsers = async () => {
  await ensureAdminUserSchema();
  const sql = await getSql();
  const rows = await sql`select count(*)::int as count from admin_users`;
  return Number(rows[0]?.count || 0);
};

const replaceUserStores = async (userId, storeIds = []) => {
  const sql = await getSql();
  await sql`delete from admin_user_stores where user_id = ${userId}`;
  for (const storeId of [...new Set(storeIds.filter(Boolean))]) {
    await sql`insert into admin_user_stores (user_id, store_id) values (${userId}, ${storeId}) on conflict do nothing`;
  }
};

const createAdminUser = async ({ loginId, displayName, role, password, storeIds = [] }) => {
  await ensureAdminUserSchema();
  if (!loginId || !password || !roles.has(role)) return null;
  if (role !== "owner" && !storeIds.length) return null;
  const sql = await getSql();
  const rows = await sql`
    insert into admin_users (user_id, login_id, display_name, role, password_hash)
    values (${randomUUID()}, ${loginId}, ${displayName || loginId}, ${role}, ${hashPassword(password)})
    returning *
  `;
  if (role !== "owner") await replaceUserStores(rows[0].user_id, storeIds);
  return (await listAdminUsers()).find((user) => user.userId === rows[0].user_id) || null;
};

const updateAdminUser = async (userId, fields = {}) => {
  await ensureAdminUserSchema();
  const sql = await getSql();
  const role = roles.has(fields.role) ? fields.role : undefined;
  const passwordHash = fields.password ? hashPassword(fields.password) : undefined;
  const rows = await sql`
    update admin_users
    set
      login_id = coalesce(${fields.loginId ?? null}, login_id),
      display_name = coalesce(${fields.displayName ?? null}, display_name),
      role = coalesce(${role ?? null}, role),
      password_hash = coalesce(${passwordHash ?? null}, password_hash),
      is_active = coalesce(${typeof fields.isActive === "boolean" ? fields.isActive : null}, is_active),
      updated_at = now()
    where user_id = ${userId}
    returning *
  `;
  if (!rows[0]) return null;
  const nextRole = role || rows[0].role;
  if (nextRole === "owner") {
    await replaceUserStores(userId, []);
  } else if (Array.isArray(fields.storeIds)) {
    await replaceUserStores(userId, fields.storeIds);
  }
  return (await listAdminUsers()).find((user) => user.userId === userId) || null;
};

const authenticateAdminUser = async ({ loginId, password }) => {
  await ensureAdminUserSchema();
  const normalizedLoginId = String(loginId || "").trim();
  const normalizedPassword = String(password || "");

  if (!normalizedLoginId || !normalizedPassword) return null;

  if ((await countAdminUsers()) === 0) {
    const legacyPassword = getPassword();
    if (legacyPassword && normalizedPassword === legacyPassword && ["owner", "admin"].includes(normalizedLoginId.toLowerCase())) {
      return createAdminUser({
        loginId: normalizedLoginId,
        displayName: "Owner",
        role: "owner",
        password: normalizedPassword,
        storeIds: [],
      });
    }
  }

  const sql = await getSql();
  const rows = await sql`
    select
      u.*,
      coalesce(array_agg(s.store_id order by s.store_id) filter (where s.store_id is not null), '{}') as store_ids
    from admin_users u
    left join admin_user_stores s on s.user_id = u.user_id
    where u.login_id = ${normalizedLoginId} and u.is_active = true
    group by u.user_id
    limit 1
  `;
  const user = rows[0];
  if (!user || !verifyPassword(normalizedPassword, user.password_hash)) return null;
  return normalizeUser(user);
};

module.exports = {
  ensureAdminUserSchema,
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  authenticateAdminUser,
};
