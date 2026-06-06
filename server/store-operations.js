const { listActiveStores } = require("./store-products");

let sqlClientPromise;

const getSql = async () => {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!sqlClientPromise) {
    sqlClientPromise = import("@neondatabase/serverless").then(({ neon }) => neon(process.env.DATABASE_URL));
  }

  return sqlClientPromise;
};

const getStoreOperation = async (storeId) => {
  const sql = await getSql();
  if (!sql) {
    return {
      storeId,
      reservationsEnabled: true,
      statusNote: "",
      updatedAt: "",
    };
  }

  const rows = await sql`
    select *
    from store_operations
    where store_id = ${storeId}
  `;
  const row = rows[0];

  return {
    storeId,
    reservationsEnabled: row?.reservations_enabled ?? true,
    statusNote: row?.status_note ?? "",
    updatedAt: row?.updated_at ?? "",
  };
};

const updateStoreOperation = async (storeId, fields) => {
  const sql = await getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");

  await sql`
    insert into store_operations (
      store_id,
      reservations_enabled,
      status_note
    ) values (
      ${storeId},
      ${fields.reservationsEnabled ?? true},
      ${fields.statusNote ?? ""}
    )
    on conflict (store_id)
    do update set
      reservations_enabled = excluded.reservations_enabled,
      status_note = excluded.status_note,
      updated_at = now()
  `;

  return getStoreOperation(storeId);
};

const getPrimaryStoreOperation = async () => {
  const stores = await listActiveStores();
  const store = stores.find((item) => item.isPrimary) || stores[0];
  return store ? getStoreOperation(store.id) : null;
};

module.exports = {
  getStoreOperation,
  getPrimaryStoreOperation,
  updateStoreOperation,
};
