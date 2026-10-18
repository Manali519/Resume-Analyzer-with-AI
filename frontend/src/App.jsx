import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import PublicLayout from "./layouts/PublicLayout.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import ScanPage from "./pages/ScanPage.jsx";

// Scrolls to #anchors after navigation, and to the top on other page changes
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

// The scanner is open to guests, but signed-in users see it inside the dashboard
function ScanLayout() {
  const { user } = useAuth();
  return user ? <DashboardLayout /> : <PublicLayout />;
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
        </Route>

        <Route element={<ScanLayout />}>
          <Route path="/scan" element={<ScanPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>
        </Route>

        <Route path="*" element={<HomePage />} />
      </Routes>
    </>
  );
}
