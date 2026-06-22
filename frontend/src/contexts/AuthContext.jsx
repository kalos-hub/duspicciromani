import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("duspicci_token");
    if (!token) { setUser(null); return; }
    try { const { data } = await api.get("/auth/me"); setUser(data); }
    catch { localStorage.removeItem("duspicci_token"); setUser(null); }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  // SSE listener
  useEffect(() => {
    if (!user || user === undefined) return;
    const token = localStorage.getItem("duspicci_token");
    if (!token) return;
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === "message") {
          import("sonner").then(({toast}) => toast(`💬 ${ev.from_name}: ${ev.text.slice(0,60)}`));
        }
      } catch {}
    };
    return () => es.close();
  }, [user]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("duspicci_token", data.access_token);
      setUser(data.user); return { ok: true };
    } catch (e) { return { ok: false, error: formatApiError(e.response?.data?.detail) }; }
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post("/auth/register", payload);
      localStorage.setItem("duspicci_token", data.access_token);
      setUser(data.user); return { ok: true };
    } catch (e) { return { ok: false, error: formatApiError(e.response?.data?.detail) }; }
  };

  const logout = () => { localStorage.removeItem("duspicci_token"); setUser(null); };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
