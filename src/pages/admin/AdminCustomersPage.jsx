import { useMemo, useState } from "react";
import { Crown, MessageCircle, Search, Sparkles, Users } from "lucide-react";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import AdminStatCard from "../../components/admin/AdminStatCard";
import { demoUsers } from "../../data/adminDemo";
import { formatCurrency } from "../../utils/currency";
import { getOrders } from "../../utils/orders";
import { getOrdersSource } from "../../utils/admin";
import { buildWhatsAppLink } from "../../utils/whatsapp";

function readUsers() {
  try {
    const raw = window.localStorage.getItem("grizzly_users");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function aggregateCustomers(orders, users) {
  const map = new Map();

  users.forEach((user) => {
    const key = user.email?.toLowerCase() || user.phone || user.id;
    if (!key) {
      return;
    }
    map.set(key, {
      key,
      name: user.name,
      phone: user.phone || "",
      email: user.email || "",
      orderCount: 0,
      totalSpent: 0,
      pendingOrders: 0,
      lastOrder: null,
    });
  });

  orders.forEach((order) => {
    const email = order.customer?.email?.toLowerCase();
    const phone = order.customer?.phone || "";
    const key = email || phone || order.number;
    const current = map.get(key) || {
      key,
      name: order.customer?.name || "Cliente sin nombre",
      phone,
      email: email || "",
      orderCount: 0,
      totalSpent: 0,
      pendingOrders: 0,
      lastOrder: null,
    };

    current.orderCount += 1;
    current.totalSpent += order.totals?.total || 0;
    if (order.status === "Pendiente de pago") {
      current.pendingOrders += 1;
    }
    if (!current.lastOrder || new Date(order.createdAt) > new Date(current.lastOrder)) {
      current.lastOrder = order.createdAt;
    }

    map.set(key, current);
  });

  return [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent);
}

function getCustomerWhatsAppLink(customer) {
  return buildWhatsAppLink(
    customer.phone,
    `Hola ${customer.name || ""}, te escribimos desde Grizzly Suplementos para ayudarte con tu compra.`,
  );
}

function AdminCustomersPage() {
  const initialSource = useMemo(() => getOrdersSource(getOrders()), []);
  const [orders] = useState(initialSource.orders);
  const [useDemoData] = useState(initialSource.useDemoData);
  const [users] = useState(() => {
    const realUsers = readUsers();
    return realUsers.length ? realUsers : demoUsers;
  });
  const [search, setSearch] = useState("");

  const customers = useMemo(() => aggregateCustomers(orders, users), [orders, users]);

  const visibleCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return customers;
    }

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.phone.includes(term) ||
        customer.email.toLowerCase().includes(term),
    );
  }, [customers, search]);

  const frequentCustomers = useMemo(
    () => customers.filter((customer) => customer.orderCount >= 2).slice(0, 5),
    [customers],
  );

  const summary = useMemo(() => {
    const pending = customers.filter((customer) => customer.pendingOrders > 0).length;
    const totalSpent = customers.reduce((acc, customer) => acc + customer.totalSpent, 0);

    return {
      customers: customers.length,
      frequent: frequentCustomers.length,
      pending,
      totalSpent,
    };
  }, [customers, frequentCustomers]);

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Clientes</p>
        <h1>Base de clientes y recompra</h1>
        <span>
          Contactos, historial, pedidos pendientes y deteccion de clientes frecuentes para
          seguimiento comercial.
        </span>
      </header>

      {useDemoData && (
        <section className="admin-demo-note">
          Base de clientes de ejemplo cargada para mostrar como quedaria el CRM comercial.
        </section>
      )}

      <section className="admin-kpi-grid">
        <AdminStatCard
          icon={Users}
          title="Clientes detectados"
          value={summary.customers}
          helper="Contactos unificados desde usuarios y pedidos."
        />
        <AdminStatCard
          icon={Crown}
          title="Clientes frecuentes"
          value={summary.frequent}
          helper="Compraron dos veces o mas."
        />
        <AdminStatCard
          icon={Sparkles}
          title="Con pendientes"
          value={summary.pending}
          helper="Necesitan seguimiento o recordatorio."
          tone="warn"
        />
        <AdminStatCard
          icon={MessageCircle}
          title="Valor acumulado"
          value={formatCurrency(summary.totalSpent)}
          helper="Total comprado por la base actual."
          tone="highlight"
        />
      </section>

      <section className="admin-two-col">
        <article className="admin-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Fidelizacion</span>
              <h2>Clientes frecuentes</h2>
            </div>
          </div>
          {!frequentCustomers.length ? (
            <AdminEmptyState
              compact
              title="No hay clientes frecuentes aun"
              description="En cuanto se repitan compras, este bloque te va a ayudar a detectar recompra real."
            />
          ) : (
            <ul className="admin-simple-list">
              {frequentCustomers.map((customer) => {
                const whatsappLink = getCustomerWhatsAppLink(customer);

                return (
                  <li key={customer.key}>
                    <div>
                      <b>{customer.name}</b>
                      <small>{customer.phone || customer.email}</small>
                    </div>
                    <div>
                      <b>{customer.orderCount} pedidos</b>
                      <small>{formatCurrency(customer.totalSpent)}</small>
                    </div>
                    {whatsappLink ? (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-whatsapp-btn compact"
                      >
                        <MessageCircle size={16} />
                        WhatsApp
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="admin-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Acciones sugeridas</span>
              <h2>Micro CRM comercial</h2>
            </div>
          </div>
          <ul className="admin-guide-list">
            <li>
              <b>Recordatorio de pago</b>
              <small>Contactar por WhatsApp clientes con pedido pendiente.</small>
            </li>
            <li>
              <b>Recompra</b>
              <small>Enviar promos a quienes ya muestran alta frecuencia de compra.</small>
            </li>
            <li>
              <b>Reactivacion</b>
              <small>Detectar clientes inactivos para una oferta puntual.</small>
            </li>
            <li>
              <b>Direccion preferida</b>
              <small>Registrar referencias utiles para acelerar futuras entregas.</small>
            </li>
          </ul>
        </article>
      </section>

      <section className="admin-card admin-table-card">
        <div className="admin-card-title">
          <div>
            <span className="admin-card-kicker">Base comercial</span>
            <h2>Listado de clientes</h2>
          </div>
        </div>
        <div className="admin-toolbar admin-toolbar-orders">
          <label className="admin-search-shell">
            <Search size={17} />
            <input
              type="search"
              value={search}
              placeholder="Buscar por nombre, email o telefono"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {!visibleCustomers.length ? (
          <AdminEmptyState
            title="No hay clientes para mostrar con esa busqueda"
            description="Proba con otro termino o espera nuevas compras para ampliar la base."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Telefono</th>
                  <th>Email</th>
                  <th>Pedidos</th>
                  <th>Pendientes</th>
                  <th>Total comprado</th>
                  <th>WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {visibleCustomers.map((customer) => {
                  const whatsappLink = getCustomerWhatsAppLink(customer);

                  return (
                    <tr key={customer.key}>
                      <td>
                        <b>{customer.name}</b>
                        {customer.orderCount >= 3 ? (
                          <small className="admin-row-highlight">Cliente con alta recompra</small>
                        ) : null}
                      </td>
                      <td>{customer.phone || "-"}</td>
                      <td>{customer.email || "-"}</td>
                      <td>{customer.orderCount}</td>
                      <td>{customer.pendingOrders}</td>
                      <td>{formatCurrency(customer.totalSpent)}</td>
                      <td>
                        {whatsappLink ? (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-whatsapp-btn compact"
                          >
                            <MessageCircle size={16} />
                            Abrir chat
                          </a>
                        ) : (
                          <span className="admin-cell-muted">Sin telefono</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminCustomersPage;
