import AdminLayout from "./AdminLayout";
import AdminLoginScreen from "./AdminLoginScreen";
import { useAuthSupabase } from "../../shared/auth/AuthSupabaseProvider";

function AdminAccessGate() {
  const { cargando, estaAutenticado, esAdmin } = useAuthSupabase();

  if (cargando) {
    return <AdminLoginScreen mode="loading" />;
  }

  if (!estaAutenticado) {
    return <AdminLoginScreen />;
  }

  if (!esAdmin) {
    return <AdminLoginScreen mode="unauthorized" />;
  }

  return <AdminLayout />;
}

export default AdminAccessGate;
