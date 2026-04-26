import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  CalendarDays,
  ChevronDown,
  CreditCard,
  HandCoins,
  ReceiptText,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from "lucide-react";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import AdminStatCard from "../../components/admin/AdminStatCard";
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

function toMonthInput(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(value) {
  const [year, month] = String(value || "").split("-");
  if (!year || !month) {
    return "mes actual";
  }

  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(year), Number(month) - 1, 1));
}

function isSameMonth(value, monthKey) {
  return toMonthInput(value) === monthKey;
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
  const [selectedMonth, setSelectedMonth] = useState(toMonthInput(new Date()));
  const [typeFilter, setTypeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const typeMap = useMemo(
    () => new Map(CASH_MOVEMENT_TYPES.map((item) => [item.id, item])),
    [],
  );

  const orderedMovements = useMemo(
    () => [...movements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [movements],
  );

  const monthMovements = useMemo(
    () => orderedMovements.filter((movement) => isSameMonth(movement.createdAt, selectedMonth)),
    [orderedMovements, selectedMonth],
  );

  const filteredMovements = useMemo(
    () =>
      monthMovements.filter((movement) => {
        const matchesType = typeFilter === "all" || movement.type === typeFilter;
        const matchesPayment =
          paymentFilter === "all" || movement.paymentMethod === paymentFilter;
        return matchesType && matchesPayment;
      }),
    [monthMovements, paymentFilter, typeFilter],
  );

  const paymentBreakdown = useMemo(() => {
    const bucket = new Map();

    filteredMovements.forEach((movement) => {
      const key = movement.paymentMethod || "Sin definir";
      const current = bucket.get(key) || {
        method: key,
        income: 0,
        expense: 0,
        count: 0,
      };

      if (movement.direction === "in") {
        current.income += movement.amount || 0;
      } else if (movement.direction === "out") {
        current.expense += movement.amount || 0;
      }

      current.count += 1;
      bucket.set(key, current);
    });

    return [...bucket.values()]
      .map((item) => ({
        ...item,
        net: item.income - item.expense,
      }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [filteredMovements]);

  const categoryBreakdown = useMemo(() => {
    const bucket = new Map();

    filteredMovements.forEach((movement) => {
      const key = movement.category || "Sin rubro";
      const current = bucket.get(key) || {
        category: key,
        income: 0,
        expense: 0,
        count: 0,
      };

      if (movement.direction === "in") {
        current.income += movement.amount || 0;
      } else if (movement.direction === "out") {
        current.expense += movement.amount || 0;
      }

      current.count += 1;
      bucket.set(key, current);
    });

    return [...bucket.values()]
      .map((item) => ({
        ...item,
        net: item.income - item.expense,
      }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [filteredMovements]);

  const summary = useMemo(() => {
    const overallBalance = orderedMovements.reduce(
      (acc, movement) => acc + signedAmount(movement),
      0,
    );
    const monthIncome = monthMovements
      .filter((movement) => movement.direction === "in")
      .reduce((acc, movement) => acc + (movement.amount || 0), 0);
    const monthExpense = monthMovements
      .filter((movement) => movement.direction === "out")
      .reduce((acc, movement) => acc + (movement.amount || 0), 0);
    const creditNotesAmount = monthMovements
      .filter((movement) => movement.type === "nota_credito")
      .reduce((acc, movement) => acc + (movement.amount || 0), 0);
    const refundsAmount = monthMovements
      .filter((movement) => movement.type === "reintegro")
      .reduce((acc, movement) => acc + (movement.amount || 0), 0);
    const openingAmount = monthMovements
      .filter((movement) => movement.type === "apertura")
      .reduce((acc, movement) => acc + (movement.amount || 0), 0);
    const monthNet = monthIncome - monthExpense;
    const profitability =
      monthIncome > 0 ? Math.round((monthNet / monthIncome) * 100) : 0;
    const riskMovements = monthMovements.filter((movement) =>
      ["nota_credito", "reintegro", "ajuste_negativo"].includes(movement.type),
    ).length;

    return {
      overallBalance,
      monthIncome,
      monthExpense,
      monthNet,
      profitability,
      creditNotesAmount,
      refundsAmount,
      openingAmount,
      movementCount: monthMovements.length,
      filteredCount: filteredMovements.length,
      riskMovements,
    };
  }, [filteredMovements.length, monthMovements, orderedMovements]);

  const selectedType = typeMap.get(draft.type) || CASH_MOVEMENT_TYPES[1];
  const monthLabel = formatMonthLabel(selectedMonth);
  const paymentLeader = paymentBreakdown[0];
  const categoryLeader = categoryBreakdown[0];

  const executiveNotes = useMemo(
    () => [
      {
        title: "Resultado del mes",
        value: formatCurrency(summary.monthNet),
        helper:
          summary.monthNet >= 0
            ? `El periodo cierra positivo con un margen operativo estimado del ${summary.profitability}%.`
            : "El periodo esta en rojo y conviene revisar egresos, notas de credito y retiros.",
      },
      {
        title: "Medio dominante",
        value: paymentLeader ? paymentLeader.method : "Sin datos",
        helper: paymentLeader
          ? `${formatCurrency(paymentLeader.net)} de impacto neto con ${paymentLeader.count} movimientos.`
          : "Todavia no hay datos suficientes para comparar medios de cobro.",
      },
      {
        title: "Rubro con mas peso",
        value: categoryLeader ? categoryLeader.category : "Sin rubro lider",
        helper: categoryLeader
          ? `${formatCurrency(categoryLeader.net)} de impacto neto acumulado en el periodo filtrado.`
          : "Aun no hay rubros con movimientos dentro del mes.",
      },
    ],
    [categoryLeader, paymentLeader, summary.monthNet, summary.profitability],
  );

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
    setSelectedMonth(toMonthInput(new Date()));
  };

  return (
    <div className="admin-page-root cash-admin-page">
      <header className="admin-page-header">
        <p>Caja</p>
        <h1>Control financiero operativo</h1>
        <span>
          Unifica ingresos, egresos, notas de credito, reintegros, retiros y ajustes para leer la
          salud mensual del negocio sin cambiar la logica de tu caja actual.
        </span>
      </header>

      <section className="admin-card cash-toolbar-card">
        <div className="admin-card-title">
          <div>
            <span className="admin-card-kicker">Lectura mensual</span>
            <h2>Filtro de control y rentabilidad</h2>
          </div>
        </div>

        <div className="cash-toolbar">
          <label className="cash-toolbar-field">
            Mes
            <div className="cash-toolbar-shell with-icon">
              <CalendarDays size={16} />
              <input
                type="month"
                className="cash-toolbar-input"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              />
            </div>
          </label>

          <label className="cash-toolbar-field">
            Tipo
            <div className="cash-toolbar-shell with-icon is-select">
              <ReceiptText size={16} />
              <select
                className="cash-toolbar-select"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="all">Todos los movimientos</option>
                {CASH_MOVEMENT_TYPES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <span className="cash-toolbar-caret" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </div>
          </label>

          <label className="cash-toolbar-field">
            Medio
            <div className="cash-toolbar-shell with-icon is-select">
              <CreditCard size={16} />
              <select
                className="cash-toolbar-select"
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
              >
                <option value="all">Todos los medios</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Mercado Pago">Mercado Pago</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Mixto">Mixto</option>
              </select>
              <span className="cash-toolbar-caret" aria-hidden="true">
                <ChevronDown size={16} />
              </span>
            </div>
          </label>
        </div>

        <div className="cash-toolbar-note">
          <b>{monthLabel}</b>
          <span>
            {summary.filteredCount} movimientos visibles sobre {summary.movementCount} cargados en
            el mes.
          </span>
        </div>
      </section>

      <section className="admin-kpi-grid">
        <AdminStatCard
          icon={Wallet}
          title="Saldo actual"
          value={formatCurrency(summary.overallBalance)}
          helper="Resultado acumulado de todos los movimientos registrados."
          tone="highlight"
        />
        <AdminStatCard
          icon={ArrowUpCircle}
          title="Ingresos del mes"
          value={formatCurrency(summary.monthIncome)}
          helper="Entradas de dinero dentro del periodo seleccionado."
        />
        <AdminStatCard
          icon={ArrowDownCircle}
          title="Egresos del mes"
          value={formatCurrency(summary.monthExpense)}
          helper="Salidas entre gastos, retiros, reintegros y notas de credito."
          tone="warn"
        />
        <AdminStatCard
          icon={TrendingUp}
          title="Resultado neto"
          value={formatCurrency(summary.monthNet)}
          helper={`Margen operativo estimado: ${summary.profitability}% sobre ingresos del mes.`}
          tone={summary.monthNet >= 0 ? "default" : "danger"}
        />
        <AdminStatCard
          icon={BadgeDollarSign}
          title="Notas de credito"
          value={formatCurrency(summary.creditNotesAmount)}
          helper={`${summary.riskMovements} movimientos sensibles dentro del mes.`}
          tone="danger"
        />
        <AdminStatCard
          icon={HandCoins}
          title="Apertura registrada"
          value={formatCurrency(summary.openingAmount)}
          helper={`${summary.filteredCount} movimientos visibles en el tablero actual.`}
        />
      </section>

      <section className="admin-two-col cash-top-grid">
        <article className="admin-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Movimiento operativo</span>
              <h2>Nuevo movimiento</h2>
            </div>
          </div>
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
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, category: event.target.value }))
                }
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

        <article className="admin-card cash-executive-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Lectura premium</span>
              <h2>Tablero ejecutivo de caja</h2>
            </div>
          </div>

          <div className="cash-insight-grid">
            {executiveNotes.map((item) => (
              <article key={item.title} className="cash-insight-card">
                <span>{item.title}</span>
                <strong>{item.value}</strong>
                <small>{item.helper}</small>
              </article>
            ))}
          </div>

          <ul className="cash-operations-list">
            <li>
              <ShieldAlert size={16} />
              <div>
                <b>Notas de credito y reintegros visibles</b>
                <small>
                  {formatCurrency(summary.creditNotesAmount + summary.refundsAmount)} acumulados en
                  devoluciones financieras del mes.
                </small>
              </div>
            </li>
            <li>
              <CreditCard size={16} />
              <div>
                <b>Conciliacion por medio de pago</b>
                <small>
                  Separa efectivo, transferencia, Mercado Pago y tarjeta para detectar donde entra o
                  se pierde caja.
                </small>
              </div>
            </li>
            <li>
              <ReceiptText size={16} />
              <div>
                <b>Trazabilidad por referencia</b>
                <small>
                  Cada movimiento queda vinculado a pedido, comprobante o motivo para auditar la
                  operacion despues.
                </small>
              </div>
            </li>
          </ul>
        </article>
      </section>

      <section className="admin-two-col cash-breakdown-grid">
        <article className="admin-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Canales de cobro</span>
              <h2>Impacto por medio</h2>
            </div>
          </div>
          {paymentBreakdown.length ? (
            <div className="cash-breakdown-list">
              {paymentBreakdown.map((item) => (
                <article key={item.method} className="cash-breakdown-item">
                  <div>
                    <strong>{item.method}</strong>
                    <small>{item.count} movimientos</small>
                  </div>
                  <div className="cash-breakdown-values">
                    <span>+ {formatCurrency(item.income)}</span>
                    <span>- {formatCurrency(item.expense)}</span>
                    <b className={item.net >= 0 ? "positive" : "negative"}>
                      {item.net >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(item.net))}
                    </b>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              compact
              title="Sin movimientos para este filtro"
              description="Cambia mes, tipo o medio para ver mas detalle por canal de cobro."
            />
          )}
        </article>

        <article className="admin-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Rubros</span>
              <h2>Impacto por categoria</h2>
            </div>
          </div>
          {categoryBreakdown.length ? (
            <div className="cash-breakdown-list">
              {categoryBreakdown.slice(0, 8).map((item) => (
                <article key={item.category} className="cash-breakdown-item">
                  <div>
                    <strong>{item.category}</strong>
                    <small>{item.count} movimientos</small>
                  </div>
                  <div className="cash-breakdown-values">
                    <span>+ {formatCurrency(item.income)}</span>
                    <span>- {formatCurrency(item.expense)}</span>
                    <b className={item.net >= 0 ? "positive" : "negative"}>
                      {item.net >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(item.net))}
                    </b>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              compact
              title="Sin rubros visibles"
              description="Cuando registres movimientos vas a ver donde se concentra la rentabilidad."
            />
          )}
        </article>
      </section>

      <section className="admin-card admin-table-card">
        <div className="admin-card-title">
          <div>
            <span className="admin-card-kicker">Historial</span>
            <h2>Movimientos del periodo</h2>
          </div>
        </div>
        <p className="cash-table-note">
          Este historial ya respeta el filtro de <b>{monthLabel}</b>, tipo y medio de pago para
          revisar caja con mas contexto operativo.
        </p>
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
              {filteredMovements.map((movement) => (
                <tr key={movement.id}>
                  <td>{formatCompactDate(movement.createdAt)}</td>
                  <td>
                    <span className={`cash-movement-type ${movement.direction || "neutral"}`}>
                      {movement.label}
                    </span>
                  </td>
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
        {!filteredMovements.length ? (
          <AdminEmptyState
            compact
            title="No hay movimientos en este filtro"
            description="Prueba con otro mes o amplia el filtro para recuperar mas actividad."
          />
        ) : null}
      </section>
    </div>
  );
}

export default AdminCashPage;
