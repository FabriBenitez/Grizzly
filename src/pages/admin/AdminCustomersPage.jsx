import { useMemo, useState } from "react";
import { demoUsers } from "../../data/adminDemo";
import { formatCurrency } from "../../utils/currency";
import { getOrders } from "../../utils/orders";
import { getOrdersSource } from "../../utils/admin";

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

      <section className="admin-two-col">
        <article className="admin-card">
          <h2>Clientes frecuentes</h2>
          {!frequentCustomers.length ? (
            <p>No hay clientes frecuentes aun.</p>
          ) : (
            <ul className="admin-simple-list">
              {frequentCustomers.map((customer) => (
                <li key={customer.key}>
                  <div>
                    <b>{customer.name}</b>
                    <small>{customer.phone || customer.email}</small>
                  </div>
                  <div>
                    <b>{customer.orderCount} pedidos</b>
                    <small>{formatCurrency(customer.totalSpent)}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="admin-card">
          <h2>Acciones sugeridas</h2>
          <ul className="admin-list">
            <li>Contactar por WhatsApp clientes con pago pendiente.</li>
            <li>Enviar promociones a clientes con alta recompra.</li>
            <li>Detectar clientes inactivos para campana de reactivacion.</li>
            <li>Registrar direccion preferida para facilitar checkout.</li>
          </ul>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-toolbar">
          <input
            type="search"
            value={search}
            placeholder="Buscar por nombre, email o telefono"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

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
              </tr>
            </thead>
            <tbody>
              {visibleCustomers.map((customer) => (
                <tr key={customer.key}>
                  <td>{customer.name}</td>
                  <td>{customer.phone || "-"}</td>
                  <td>{customer.email || "-"}</td>
                  <td>{customer.orderCount}</td>
                  <td>{customer.pendingOrders}</td>
                  <td>{formatCurrency(customer.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminCustomersPage;
