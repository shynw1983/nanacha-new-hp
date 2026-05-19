"use client";

import { useState } from "react";

const roleLabels = {
  owner: "本部管理者",
  manager: "店舗管理者",
  staff: "スタッフ",
};

export function AdminStaffBoard({ initialUsers, stores }) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState({
    loginId: "",
    displayName: "",
    password: "",
    role: "staff",
    storeIds: stores[0]?.id ? [stores[0].id] : [],
  });
  const [error, setError] = useState("");

  const toggleStore = (storeId) => {
    setForm((current) => ({
      ...current,
      storeIds: current.storeIds.includes(storeId)
        ? current.storeIds.filter((id) => id !== storeId)
        : [...current.storeIds, storeId],
    }));
  };

  const createUser = async (event) => {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "スタッフを作成できませんでした。");
      return;
    }
    setUsers((current) => [...current, body.user]);
    setForm({ loginId: "", displayName: "", password: "", role: "staff", storeIds: stores[0]?.id ? [stores[0].id] : [] });
  };

  const updateUser = async (userId, patch) => {
    const response = await fetch(`/api/admin/staff/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (response.ok) {
      const body = await response.json();
      setUsers((current) => current.map((user) => (user.userId === userId ? body.user : user)));
    }
  };

  return (
    <section className="admin-staff-layout">
      <form className="admin-panel admin-staff-form" onSubmit={createUser}>
        <h2>スタッフを追加</h2>
        <label>
          ログインID
          <input value={form.loginId} onChange={(event) => setForm({ ...form, loginId: event.target.value })} required />
        </label>
        <label>
          表示名
          <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required />
        </label>
        <label>
          初期パスワード
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </label>
        <label>
          権限
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="staff">スタッフ</option>
            <option value="manager">店舗管理者</option>
            <option value="owner">本部管理者</option>
          </select>
        </label>
        {form.role !== "owner" ? (
          <fieldset>
            <legend>担当店舗</legend>
            {stores.map((store) => (
              <label key={store.id}>
                <input type="checkbox" checked={form.storeIds.includes(store.id)} onChange={() => toggleStore(store.id)} />
                {store.name}
              </label>
            ))}
          </fieldset>
        ) : null}
        <button type="submit">追加する</button>
        {error ? <p className="admin-error">{error}</p> : null}
      </form>

      <section className="admin-panel admin-staff-list">
        <h2>スタッフ一覧</h2>
        {users.map((user) => (
          <article key={user.userId}>
            <div>
              <strong>{user.displayName}</strong>
              <span>{user.loginId}</span>
            </div>
            <div>
              <span>{roleLabels[user.role] || user.role}</span>
              <small>{user.role === "owner" ? "全店舗" : user.storeIds.join(", ") || "店舗未設定"}</small>
            </div>
            <button type="button" className="secondary" onClick={() => updateUser(user.userId, { isActive: !user.isActive })}>
              {user.isActive ? "有効" : "停止中"}
            </button>
          </article>
        ))}
      </section>
    </section>
  );
}
