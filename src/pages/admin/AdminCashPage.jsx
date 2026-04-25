import { useMemo, useState } from "react";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { formatCompactDate, formatCurrency } from "../../utils/currency";

const CASH_MOVEMENT_TYPES = [
  { id: "apertura", label: "Apertura", direction: "in" },
  { id: "ingreso", label: "Ingreso", direction: "in" },
  { id: "egreso", label: "Egreso", direction: "out" },
  { id: "nota_credito", label: "Nota de credito", direction: "out" },
  { id: "reintegro", label: "Reintegro", direction: "out" },
  { id: "retiro", label: "Retiro", direction: "out" },
  { id: "ajuste_positivo", label: "Ajuste positivo", direction: "in" },
  { id: "ajuste_negativo", label: "Ajuste negativo", direction: "out" },
  { id: "cierre", label: "Cierre", direction: "neutral" },
];

const initialCashMovements = [
  {
    id: "cash_1",
    type: "apertura",
    label: "Apertura",
    amount: 85000,
    direction: "in",
    paymentMethod: "Efectivo",
    category: "Apertura diaria",
    reference: "Caja mostrador manana",
    notes: "Saldo inicial para comenzar el turno.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "cash_2",
    type: "ingreso",
    label: "Ingreso",
    amount: 32000,
    direction: "in",
    paymentMethod: "Transferencia",
    category: "Venta",
    reference: "Pedido #000126",
    notes: "Cobro confirmado.",
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: "cash_3",
    type: "egreso",
    label: "Egreso",
    amount: 12500,
    direction: "out",
    paymentMethod: "Efectivo",
    category: "Gasto operativo",
    reference: "Reposicion de embalaje",
    notes: "Compra de cintas y cajas.",
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
  },
];

function signedAmount(movement) {
  if (movement.direction === "out") {
    return -Math.abs(movement.amount || 0);
  }
  if (movement.direction === "in") {
    return Math.abs(movement.amount || 0);
  }
  return 0;
}

function AdminCashPage() {
  const [movements, setMovements] = useLocalStorage("grizzly_cash_movements", initialCashMovements);
  const [draft, setDraft] = useState({
    type: "ingreso",
    paymentMethod: "Efectivo",
    category: "Venta",
    amount: "",
    reference: "",
    notes: "",
  });

  const typeMap = useMemo(
    () => new Map(CASH_MOVEMENT_TYPES.map((item) => [item.id, item])),
    [],
  );

  const summary = useMemo(() => {
    const today = new Date().toDateString();
    const todayMovements = movements.filter(
      (movement) => new Date(movement.createdAt).toDateString() === today,
    );

    const balance = movements.reduce((acc, movement) => acc + signedAmount(movement), 0);
    const income = todayMovements
      .filter((movement) => movement.direction === "in")
      .reduce((acc, movement) => acc + movement.amount, 0);
    const expense = todayMovements
      .filter((movement) => movement.direction === "out")
      .reduce((acc, movement) => acc + movement.amount, 0);
    const creditNotes = todayMovements.filter((movement) => movement.type === "nota_credito").length;

    return {
      balance,
      income,
      expense,
      creditNotes,
      movementCount: todayMovements.length,
    };
  }, [movements]);

  const orderedMovements = useMemo(
    () => [...movements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [movements],
  );

  const selectedType = typeMap.get(draft.type) || CASH_MOVEMENT_TYPES[1];

  const submitMovement = (event) => {
    event.preventDefault();
    if (!Number(draft.amount) || !draft.reference.trim()) {
      return;
    }

    setMovements((prev) => [
      {
        id: `cash_${Date.now()}`,
        type: selectedType.id,
        label: selectedType.label,
        amount: Number(draft.amount),
        direction: selectedType.direction,
        paymentMethod: draft.paymentMethod,
        category: draft.category,
        reference: draft.reference.trim(),
        notes: draft.notes.trim(),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setDraft({
      type: "ingreso",
      paymentMethod: "Efectivo",
      category: "Venta",
      amount: "",
      reference: "",
      notes: "",
    });
  };

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Caja</p>
        <h1>Control inicial de caja</h1>
        <span>
          Registra apertura, ingresos, egresos, notas de credito, reintegros, retiros y ajustes
          para arrancar con una caja bastante completa.
        </span>
      </header>

      <section className="admin-kpi-grid">
        <article>
          <p>Saldo actual</p>
          <strong>{formatCurrency(summary.balance)}</strong>
        </article>
        <article>
          <p>Ingresos del dia</p>
          <strong>{formatCurrency(summary.income)}</strong>
        </article>
        <article>
          <p>Egresos del dia</p>
          <strong>{formatCurrency(summary.expense)}</strong>
        </article>
        <article>
          <p>Notas de credito</p>
          <strong>{summary.creditNotes}</strong>
        </article>
      </section>

      <section className="admin-two-col">
        <article className="admin-card">
          <h2>Nuevo movimiento</h2>
          <form className="cash-form-grid" onSubmit={submitMovement}>
            <label>
              Tipo de movimiento
              <select
                value={draft.type}
                onChange={(event) => setDraft((prev) => ({ ...prev, type: event.target.value }))}
              >
                {CASH_MOVEMENT_TYPES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Medio de pago
              <select
                value={draft.paymentMethod}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, paymentMethod: event.target.value }))
                }
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Mercado Pago</option>
                <option>Tarjeta</option>
                <option>Mixto</option>
              </select>
            </label>
            <label>
              Rubro
              <input
                type="text"
                value={draft.category}
                onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
              />
            </label>
            <label>
              Monto
              <input
                type="number"
                min="0"
                value={draft.amount}
                onChange={(event) => setDraft((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </label>
            <label className="cash-form-wide">
              Referencia o comprobante
              <input
                type="text"
                placeholder="Ej: Pedido #000140 / NC-0003 / Pago proveedor"
                value={draft.reference}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, reference: event.target.value }))
                }
              />
            </label>
            <label className="cash-form-wide">
              Observaciones
              <textarea
                rows="3"
                value={draft.notes}
                onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>
            <button type="submit">Registrar movimiento</button>
          </form>
        </article>

        <article className="admin-card">
          <h2>Que conviene controlar desde el inicio</h2>
          <ul className="admin-list">
            <li>Apertura y cierre por turno para saber con cuanto arranca y cierra cada caja.</li>
            <li>Notas de credito y reintegros para no mezclar devoluciones con ventas reales.</li>
            <li>Egresos operativos separados de pagos a proveedores o retiros personales.</li>
            <li>Referencia o comprobante obligatorio para cada movimiento registrado.</li>
            <li>Medio de pago para distinguir efectivo, transferencia, Mercado Pago y tarjeta.</li>
          </ul>
        </article>
      </section>

      <section className="admin-card">
        <h2>Movimientos recientes</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Rubro</th>
                <th>Referencia</th>
                <th>Medio</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {orderedMovements.map((movement) => (
                <tr key={movement.id}>
                  <td>{formatCompactDate(movement.createdAt)}</td>
                  <td>{movement.label}</td>
                  <td>{movement.category}</td>
                  <td>
                    <b>{movement.reference}</b>
                    {movement.notes && <small>{movement.notes}</small>}
                  </td>
                  <td>{movement.paymentMethod}</td>
                  <td>
                    <span
                      className={`cash-amount ${signedAmount(movement) < 0 ? "out" : signedAmount(movement) > 0 ? "in" : "neutral"}`}
                    >
                      {signedAmount(movement) < 0 ? "-" : signedAmount(movement) > 0 ? "+" : ""}
                      {formatCurrency(Math.abs(movement.amount))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminCashPage;
