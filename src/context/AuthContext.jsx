import { createContext, useContext } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

const AuthContext = createContext(null);

function createUserId() {
  return `u_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useLocalStorage("grizzly_users", []);
  const [session, setSession] = useLocalStorage("grizzly_session", null);

  const login = ({ email, password }) => {
    const user = users.find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password,
    );

    if (!user) {
      return { ok: false, message: "Credenciales inválidas" };
    }

    setSession({ userId: user.id });
    return { ok: true };
  };

  const register = ({ name, phone, email, password }) => {
    const alreadyExists = users.some((item) => item.email.toLowerCase() === email.toLowerCase());
    if (alreadyExists) {
      return { ok: false, message: "Ya existe una cuenta con ese email" };
    }

    const user = {
      id: createUserId(),
      name,
      phone,
      email,
      password,
      addresses: [],
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, user]);
    setSession({ userId: user.id });
    return { ok: true };
  };

  const logout = () => setSession(null);

  const updateUser = (patch) => {
    if (!session?.userId) {
      return;
    }

    setUsers((prev) =>
      prev.map((user) => (user.id === session.userId ? { ...user, ...patch } : user)),
    );
  };

  const currentUser = users.find((item) => item.id === session?.userId) || null;

  const value = {
    currentUser,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
