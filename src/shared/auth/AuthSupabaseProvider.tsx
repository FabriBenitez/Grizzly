import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

interface EstadoAuthSupabase {
  cargando: boolean;
  sesion: Session | null;
  usuario: User | null;
  estaAutenticado: boolean;
}

const AuthSupabaseContext = createContext<EstadoAuthSupabase | null>(null);

interface AuthSupabaseProviderProps {
  children: ReactNode;
}

export function AuthSupabaseProvider({ children }: AuthSupabaseProviderProps) {
  const [cargando, setCargando] = useState(Boolean(supabase));
  const [sesion, setSesion] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) {
      setCargando(false);
      return undefined;
    }

    let activo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!activo) {
        return;
      }

      setSesion(data.session);
      setUsuario(data.session?.user ?? null);
      setCargando(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion);
      setUsuario(nuevaSesion?.user ?? null);
      setCargando(false);
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  const valor = useMemo<EstadoAuthSupabase>(
    () => ({
      cargando,
      sesion,
      usuario,
      estaAutenticado: Boolean(usuario),
    }),
    [cargando, sesion, usuario],
  );

  return <AuthSupabaseContext.Provider value={valor}>{children}</AuthSupabaseContext.Provider>;
}

export function useAuthSupabase() {
  const contexto = useContext(AuthSupabaseContext);

  if (!contexto) {
    throw new Error("useAuthSupabase debe usarse dentro de AuthSupabaseProvider.");
  }

  return contexto;
}
