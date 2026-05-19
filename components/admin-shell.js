import Link from "next/link";

const navItems = [
  { href: "/admin/dashboard", label: "ダッシュボード" },
  { href: "/admin/orders", label: "注文" },
  { href: "/admin/products", label: "商品" },
  { href: "/admin/reports", label: "レポート" },
  { href: "/admin/stores", label: "店舗", roles: ["owner", "manager"] },
  { href: "/admin/staff", label: "スタッフ", roles: ["owner"] },
];

const roleLabels = {
  owner: "本部管理者",
  manager: "店舗管理者",
  staff: "スタッフ",
};

export function AdminShell({ title, eyebrow, activePath, children, actions, currentUser }) {
  const visibleNavItems = navItems.filter((item) => !item.roles || item.roles.includes(currentUser?.role));

  return (
    <main className="admin-app">
      <aside className="admin-sidebar">
        <div>
          <p>nanacha</p>
          <strong>Admin</strong>
          {currentUser ? (
            <small>
              {currentUser.displayName}
              <br />
              {roleLabels[currentUser.role] || currentUser.role}
            </small>
          ) : null}
        </div>
        <nav aria-label="管理メニュー">
          {visibleNavItems.map((item) => (
            <Link className={activePath === item.href ? "is-active" : ""} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="admin-workspace">
        <header className="admin-page-header">
          <div>
            <p>{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          {actions ? <div className="admin-page-actions">{actions}</div> : null}
        </header>
        {children}
      </section>
    </main>
  );
}
