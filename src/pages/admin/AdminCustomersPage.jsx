import { useMemo, useState } from "react";
import { Crown, MessageCircle, Search, Sparkles, Users } from "lucide-react";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import AdminStatCard from "../../components/admin/AdminStatCard";
import { useAdminOrdersData } from "../../hooks/useAdminOrdersData";
import { formatCurrency } from "../../utils/currency";
import { buildWhatsAppLink } from "../../utils/whatsapp";

function aggregateCustomers(orders) {
  const map = new Map();

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
  const { orders, loading, error } = useAdminOrdersData();
  const [search, setSearch] = useState("");

  const customers = useMemo(() => aggregateCustomers(orders), [orders]);

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



      {!loading && error && <div className="admin-message error" style={{ margin: "12px 0 0" }}>{error}</div>}

      <section className="admin-kpi-grid">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-title" style={{ width: "40%" }}></div>
              <div className="skeleton skeleton-text" style={{ height: 32, width: "70%" }}></div>
              <div className="skeleton skeleton-text" style={{ width: "90%" }}></div>
            </div>
          ))
        ) : (
          <>
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
          </>
        )}
      </section>

      <section className="admin-two-col">
        <article className="admin-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Fidelizacion</span>
              <h2>Clientes frecuentes</h2>
            </div>
          </div>
          {loading ? (
            <ul className="admin-simple-list">
              {[...Array(3)].map((_, i) => (
                <li key={i}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                    <div className="skeleton skeleton-title" style={{ width: "40%", margin: 0 }}></div>
                    <div className="skeleton skeleton-text" style={{ width: "60%", margin: 0, height: 10 }}></div>
                  </div>
                </li>
              ))}
            </ul>
          ) : !frequentCustomers.length ? (
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
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="16" height="16">
                        <path fill="#25D366" d="M3.20676 47.591c-.00237 7.924 2.06817 15.6613 6.00506 22.4808l-6.38174 23.301 23.84542-6.2524c6.5694 3.5806 13.9665 5.4706 21.4944 5.4725h.0199c24.7897 0 44.9692-20.1724 44.9796-44.9664.0048-12.0148-4.6698-23.3123-13.1629-31.812C71.5149 7.3153 60.2212 2.63217 48.1879 2.62695 23.3953 2.62695 3.21718 22.798 3.20676 47.591Z" />
                        <path fill="#ffffff" d="M1.60084 47.5769C1.598 55.7861 3.74293 63.8001 7.82006 70.8637L1.20947 95l24.70063-6.4765c6.8058 3.7109 14.4683 5.6672 22.2657 5.6701h.0199c25.6791 0 46.5836-20.8979 46.5945-46.5793.0042-12.4465-4.8386-24.15-13.6349-32.9544C72.3577 5.85655 60.6598 1.00521 48.1957 1 22.5119 1 1.61126 21.8945 1.60084 47.5769ZM16.3103 69.6474l-.9221-1.4641c-3.8772-6.1647-5.92355-13.2884-5.92071-20.6036C9.47603 26.2337 26.8483 8.86713 48.2104 8.86713 58.5551 8.8714 68.2777 12.904 75.59 20.221c7.3123 7.3175 11.3359 17.0448 11.333 27.3905-.0095 21.3465-17.3822 38.7154-38.7273 38.7154h-.0151c-6.9503-.0038-13.7666-1.8701-19.7114-5.3971l-1.4148-.8392-14.6578 3.8431 3.9137-14.2863Z" />
                        <path fill="#ffffff" d="M36.55 28.1053c-.8723-1.9389-1.79-1.9777-2.6197-2.0118-.6789-.0289-1.4555-.0271-2.2311-.0271-.7766 0-2.0379.2919-3.1044 1.4565-1.0675 1.1651-4.0753 3.9815-4.0753 9.7093 0 5.7284 4.1724 11.2634 4.7538 12.041.5823.7761 8.0542 12.9065 19.8876 17.5731 9.8349 3.8781 11.8363 3.1068 13.9708 2.9125 2.1345-.1938 6.8882-2.8154 7.8581-5.5341.9704-2.7182.9704-5.0484.6795-5.535-.291-.4852-1.0675-.7766-2.2317-1.3585-1.1646-.5823-6.8882-3.3991-7.9552-3.7876-1.0675-.388-1.8436-.5818-2.6202.5837-.7761 1.1642-3.0059 3.7858-3.6853 4.5624-.679.778-1.3584.8751-2.5226.2928-1.1646-.5842-4.9143-1.8123-9.3624-5.7781-3.4612-3.086-5.7976-6.8968-6.477-8.0624-.679-1.1641-.0725-1.7948.5112-2.3752.5231-.5216 1.1647-1.3593 1.747-2.0388.5809-.6799.7746-1.1651 1.1627-1.9417.3885-.777.1943-1.4569-.0967-2.0392-.2914-.5823-2.5538-6.3396-3.5891-8.6418Z" />
                      </svg>
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

        {!visibleCustomers.length && !loading ? (
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
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td>
                        <div className="skeleton skeleton-title" style={{ width: 120, margin: 0 }}></div>
                      </td>
                      <td><div className="skeleton skeleton-text" style={{ width: 80 }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: 140 }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: 30 }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: 30 }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: 70 }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: 80, height: 24, borderRadius: 8 }}></div></td>
                    </tr>
                  ))
                ) : (
                  visibleCustomers.map((customer) => {
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
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="16" height="16">
                                <path fill="#25D366" d="M3.20676 47.591c-.00237 7.924 2.06817 15.6613 6.00506 22.4808l-6.38174 23.301 23.84542-6.2524c6.5694 3.5806 13.9665 5.4706 21.4944 5.4725h.0199c24.7897 0 44.9692-20.1724 44.9796-44.9664.0048-12.0148-4.6698-23.3123-13.1629-31.812C71.5149 7.3153 60.2212 2.63217 48.1879 2.62695 23.3953 2.62695 3.21718 22.798 3.20676 47.591Z" />
                                <path fill="#ffffff" d="M1.60084 47.5769C1.598 55.7861 3.74293 63.8001 7.82006 70.8637L1.20947 95l24.70063-6.4765c6.8058 3.7109 14.4683 5.6672 22.2657 5.6701h.0199c25.6791 0 46.5836-20.8979 46.5945-46.5793.0042-12.4465-4.8386-24.15-13.6349-32.9544C72.3577 5.85655 60.6598 1.00521 48.1957 1 22.5119 1 1.61126 21.8945 1.60084 47.5769ZM16.3103 69.6474l-.9221-1.4641c-3.8772-6.1647-5.92355-13.2884-5.92071-20.6036C9.47603 26.2337 26.8483 8.86713 48.2104 8.86713 58.5551 8.8714 68.2777 12.904 75.59 20.221c7.3123 7.3175 11.3359 17.0448 11.333 27.3905-.0095 21.3465-17.3822 38.7154-38.7273 38.7154h-.0151c-6.9503-.0038-13.7666-1.8701-19.7114-5.3971l-1.4148-.8392-14.6578 3.8431 3.9137-14.2863Z" />
                                <path fill="#ffffff" d="M36.55 28.1053c-.8723-1.9389-1.79-1.9777-2.6197-2.0118-.6789-.0289-1.4555-.0271-2.2311-.0271-.7766 0-2.0379.2919-3.1044 1.4565-1.0675 1.1651-4.0753 3.9815-4.0753 9.7093 0 5.7284 4.1724 11.2634 4.7538 12.041.5823.7761 8.0542 12.9065 19.8876 17.5731 9.8349 3.8781 11.8363 3.1068 13.9708 2.9125 2.1345-.1938 6.8882-2.8154 7.8581-5.5341.9704-2.7182.9704-5.0484.6795-5.535-.291-.4852-1.0675-.7766-2.2317-1.3585-1.1646-.5823-6.8882-3.3991-7.9552-3.7876-1.0675-.388-1.8436-.5818-2.6202.5837-.7761 1.1642-3.0059 3.7858-3.6853 4.5624-.679.778-1.3584.8751-2.5226.2928-1.1646-.5842-4.9143-1.8123-9.3624-5.7781-3.4612-3.086-5.7976-6.8968-6.477-8.0624-.679-1.1641-.0725-1.7948.5112-2.3752.5231-.5216 1.1647-1.3593 1.747-2.0388.5809-.6799.7746-1.1651 1.1627-1.9417.3885-.777.1943-1.4569-.0967-2.0392-.2914-.5823-2.5538-6.3396-3.5891-8.6418Z" />
                              </svg>
                              Abrir chat
                            </a>
                          ) : (
                            <span className="admin-cell-muted">Sin telefono</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminCustomersPage;
