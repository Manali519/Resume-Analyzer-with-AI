import { createContext, useContext, useState } from "react";
import { api, setToken } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const startSession = ({ token, user }) => {
    setToken(token);
    setUser(user);
  };

  const login = async (credentials) => startSession(await api.login(credentials));
  const register = async (details) => startSession(await api.register(details));

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
