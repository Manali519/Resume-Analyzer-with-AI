import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV = [
  ["/", "Home"],
  ["/#how", "How It Works"],
  ["/#features", "Features"],
  ["/scan", "Know Your Chances"],
  ["/#contact", "Contact Us"],
];

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="header">
      <Link to="/" className="logo">
        Know<span>Your</span>Career
      </Link>
      <button className="burger" aria-label="Menu" onClick={() => setOpen(!open)}>
        <i /><i /><i />
      </button>
      <nav className={open ? "open" : ""} onClick={() => setOpen(false)}>
        {NAV.map(([to, label]) => (
          <Link key={to} to={to}>{label}</Link>
        ))}
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <button className="btn btn-ghost" onClick={signOut}>Logout</button>
          </>
        ) : (
          <div className="auth-btns">
            <Link to="/login" className="btn btn-ghost">Login</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </div>
        )}
      </nav>
    </header>
  );
}
