import { NavLink, Outlet } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const MENU = [
  ["/dashboard", "📊", "Analytical Dashboard"],
  ["/history", "🕘", "History"],
  ["/scan", "📄", "Scan my resume"],
];

function Sidebar({ user }) {
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <aside className="dash-side card">
      <div className="profile">
        <div className="avatar">{initials}</div>
        <b>{user.name}</b>
        <small>{user.email}</small>
        <span className="tag">{user.role}</span>
      </div>
      <nav className="dash-menu">
        {MENU.map(([to, icon, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="menu-icon">{icon}</span>{label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default function DashboardLayout() {
  const { user } = useAuth();
  return (
    <>
      <Header />
      <div className="dash">
        <Sidebar user={user} />
        <main className="dash-main">
          <Outlet />
        </main>
      </div>
      <Footer />
    </>
  );
}
