"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });

    if (!response.ok) {
      setError("ログインIDまたはパスワードが違います。");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/orders");
    router.refresh();
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <p className="eyebrow">staff</p>
        <h1>受注管理ログイン</h1>
        <p className="admin-login-hint">初回ログインIDは owner です。</p>
        <form onSubmit={handleSubmit}>
          <label>
            ログインID
            <input
              type="text"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>
          <label>
            パスワード
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "ログイン中..." : "ログイン"}
          </button>
        </form>
        {error ? <p className="admin-error">{error}</p> : null}
      </section>
    </main>
  );
}
