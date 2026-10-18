import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const FORMS = {
  login: {
    title: "Welcome back",
    subtitle: "Log in to continue your career journey.",
    submitLabel: "Login",
    busyLabel: "Logging in…",
    prompt: "Don't have an account?",
    switchTo: "/register",
    switchLabel: "Register",
    fields: [
      ["email", "email", "Email"],
      ["password", "password", "Password"],
    ],
  },
  register: {
    title: "Create your account",
    subtitle: "Join to scan resumes and track your progress.",
    submitLabel: "Create account",
    busyLabel: "Creating…",
    prompt: "Already registered?",
    switchTo: "/login",
    switchLabel: "Login",
    fields: [
      ["name", "text", "Full name"],
      ["email", "email", "Email"],
      ["password", "password", "Password"],
      ["confirm", "password", "Confirm password"],
    ],
  },
};

export default function AuthPage({ mode }) {
  const form = FORMS[mode];
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const destination = location.state?.from || "/dashboard";
  if (user) return <Navigate to={destination} replace />;

  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "register") {
      if (values.password.length < 6) return setError("Password must be at least 6 characters.");
      if (values.password !== values.confirm) return setError("Passwords do not match.");
    }
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await login({ email: values.email, password: values.password });
      else await register({ name: values.name, email: values.email, password: values.password });
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-form card" onSubmit={submit}>
        <h3>{form.title}</h3>
        <p className="auth-sub">{form.subtitle}</p>
        {form.fields.map(([key, type, placeholder]) => (
          <input key={key} required type={type} placeholder={placeholder} value={values[key]} onChange={set(key)} />
        ))}
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? form.busyLabel : form.submitLabel}</button>
        <small className="switch">
          {form.prompt} <Link to={form.switchTo} state={location.state}>{form.switchLabel}</Link>
        </small>
      </form>
    </div>
  );
}
