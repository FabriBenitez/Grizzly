import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import AdminLayout from "./components/admin/AdminLayout";
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import AboutPage from "./pages/AboutPage";
import CheckoutPage from "./pages/CheckoutPage";
import TrackOrderPage from "./pages/TrackOrderPage";
import AccountPage from "./pages/AccountPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminPromotionsPage from "./pages/admin/AdminPromotionsPage";
import AdminCustomersPage from "./pages/admin/AdminCustomersPage";
import AdminStockPage from "./pages/admin/AdminStockPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";

function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverviewPage />} />
        <Route path="pedidos" element={<AdminOrdersPage />} />
        <Route path="pagos" element={<AdminPaymentsPage />} />
        <Route path="productos" element={<AdminProductsPage />} />
        <Route path="promociones" element={<AdminPromotionsPage />} />
        <Route path="clientes" element={<AdminCustomersPage />} />
        <Route path="stock" element={<AdminStockPage />} />
        <Route path="reportes" element={<AdminReportsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/promos" element={<CatalogPage onlyPromos />} />
        <Route path="/producto/:slug" element={<ProductPage />} />
        <Route path="/quienes-somos" element={<AboutPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/seguimiento" element={<TrackOrderPage />} />
        <Route path="/cuenta" element={<AccountPage />} />
        <Route path="/inicio" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
