import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

interface Usuario {
  id: string;
  email: string;
  nome: string | null;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  cadastro: (email: string, senha: string, nome?: string) => Promise<void>;
  logout: () => void;
  fetchApi: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "casaemdia_token";
const REFRESH_KEY = "casaemdia_refresh";
const USER_KEY = "casaemdia_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const fetchApi = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const t = token ?? localStorage.getItem(TOKEN_KEY);
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...options.headers,
      };
      if (t) (headers as Record<string, string>)["Authorization"] = `Bearer ${t}`;
      const res = await fetch(`${API_URL}${path}`, { ...options, headers });
      if (res.status === 401) {
        const refresh = localStorage.getItem(REFRESH_KEY);
        if (refresh) {
          const r = await fetch(`${API_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: refresh }),
          });
          if (r.ok) {
            const data = await r.json();
            localStorage.setItem(TOKEN_KEY, data.access);
            setToken(data.access);
            (headers as Record<string, string>)["Authorization"] = `Bearer ${data.access}`;
            return fetch(`${API_URL}${path}`, { ...options, headers });
          }
        }
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUsuario(null);
        window.location.href = "/login";
      }
      return res;
    },
    [token]
  );

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (t && u) {
      setToken(t);
      try {
        setUsuario(JSON.parse(u));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
    setCarregando(false);
  }, []);

  const login = async (email: string, senha: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || "Erro ao entrar");
    localStorage.setItem(TOKEN_KEY, data.access);
    localStorage.setItem(REFRESH_KEY, data.refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
    setToken(data.access);
    setUsuario(data.usuario);
  };

  const cadastro = async (email: string, senha: string, nome?: string) => {
    const res = await fetch(`${API_URL}/api/auth/cadastro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha, nome }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || "Erro ao cadastrar");
    localStorage.setItem(TOKEN_KEY, data.access);
    localStorage.setItem(REFRESH_KEY, data.refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
    setToken(data.access);
    setUsuario(data.usuario);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider
      value={{ usuario, token, carregando, login, cadastro, logout, fetchApi }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
