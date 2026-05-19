"use client";

export function AdminLogoutButton() {
  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <button type="button" className="admin-secondary-button" onClick={logout}>
      ログアウト
    </button>
  );
}
