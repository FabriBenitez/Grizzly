import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { BaseDeDatos } from "../../lib/supabase.types";

type PerfilUsuario = BaseDeDatos["public"]["Tables"]["profiles"]["Row"];

interface CredencialesLogin {
  email: string;
  password: string;
}

interface ResultadoAuth {
  ok: boolean;
  message?: string;
}

interface EstadoAuthSupabase {
  cargando: boolean;
  sesion: Session | null;
  usuario: User | null;
  perfil: PerfilUsuario | null;
  estaAutenticado: boolean;
  esAdmin: boolean;
  puedeIniciarSesion: boolean;
  iniciarSesion: (credenciales: CredencialesLogin) => Promise<ResultadoAuth>;
  cerrarSesion: () => Promise<void>;
}

const AuthSupabaseContext = createContext<EstadoAuthSupabase | null>(null);

interface AuthSupabaseProviderProps {
  children: ReactNode;
}

export function AuthSupabaseProvider({ children }: AuthSupabaseProviderProps) {
  const [cargandoSesion, setCargandoSesion] = useState(Boolean(supabase));
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [sesion, setSesion] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);

  useEffect(() => {
    if (!supabase) {
      setCargandoSesion(false);
      return undefined;
    }

    let activo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!activo) {
        return;
      }

      setSesion(data.session);
      setUsuario(data.session?.user ?? null);
      setCargandoSesion(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion);
      setUsuario(nuevaSesion?.user ?? null);
      setCargandoSesion(false);
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !usuario?.id) {
      setPerfil(null);
      setCargandoPerfil(false);
      return undefined;
    }

    let activo = true;
    setCargandoPerfil(true);

    supabase
      .from("profiles")
      .select("id, full_name, phone, role, created_at, updated_at")
      .eq("id", usuario.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!activo) {
          return;
        }

        setPerfil(error ? null : data ?? null);
        setCargandoPerfil(false);
      });

    return () => {
      activo = false;
    };
  }, [usuario?.id]);

  const iniciarSesion = async ({
    email,
    password,
  }: CredencialesLogin): Promise<ResultadoAuth> => {
    if (!supabase) {
      return {
        ok: false,
        message:
          "Faltan las variables publicas de Supabase. Configura .env.local para habilitar el acceso admin.",
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const credencialesInvalidas =
        error.message.toLowerCase().includes("invalid login credentials") ||
        error.message.toLowerCase().includes("email not confirmed");

      return {
        ok: false,
        message: credencialesInvalidas
          ? "Email o contrasena incorrectos."
          : "No pudimos iniciar sesion en este momento.",
      };
    }

    return { ok: true };
  };

  const cerrarSesion = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  };

  const cargando = cargandoSesion || cargandoPerfil;

  const valor = useMemo<EstadoAuthSupabase>(
    () => ({
      cargando,
      sesion,
      usuario,
      perfil,
      estaAutenticado: Boolean(usuario),
      esAdmin: perfil?.role === "admin",
      puedeIniciarSesion: Boolean(supabase),
      iniciarSesion,
      cerrarSesion,
    }),
    [cargando, sesion, usuario, perfil],
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
