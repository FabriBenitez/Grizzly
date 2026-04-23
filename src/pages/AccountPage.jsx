import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import OrderStatusBadge from "../components/ui/OrderStatusBadge";
import { getOrdersByPhone } from "../utils/orders";
import { formatCompactDate, formatCurrency } from "../utils/currency";

function AccountPage() {
  const { currentUser, login, register, logout, updateUser } = useAuth();
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");

  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    email: "",
    addresses: [],
  });
  const [newAddress, setNewAddress] = useState("");

  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name,
        phone: currentUser.phone,
        email: currentUser.email,
        addresses: currentUser.addresses || [],
      });
    }
  }, [currentUser]);

  const myOrders = useMemo(() => {
    if (!currentUser?.phone) {
      return [];
    }
    return getOrdersByPhone(currentUser.phone);
  }, [currentUser?.phone]);

  const handleLogin = (event) => {
    event.preventDefault();
    const result = login(loginForm);
    setMessage(result.ok ? "Sesión iniciada correctamente." : result.message);
  };

  const handleRegister = (event) => {
    event.preventDefault();
    const result = register(registerForm);
    setMessage(result.ok ? "Cuenta creada correctamente." : result.message);
  };

  const saveProfile = (event) => {
    event.preventDefault();
    updateUser({
      name: profile.name.trim(),
      phone: profile.phone.trim(),
      addresses: profile.addresses,
    });
    setMessage("Datos actualizados.");
  };

  const addAddress = () => {
    if (!newAddress.trim()) {
      return;
    }
    setProfile((prev) => ({
      ...prev,
      addresses: [...(prev.addresses || []), newAddress.trim()],
    }));
    setNewAddress("");
  };

  if (!currentUser) {
    return (
      <div className="container section-space account-page">
        <header className="section-title">
          <p>Usuarios</p>
          <h1>Iniciar sesión o registrarse</h1>
          <span>Guardá tus datos para recomprar más rápido y seguir tus pedidos.</span>
        </header>

        <div className="account-auth-grid">
          <form className="account-card" onSubmit={handleLogin}>
            <h2>Iniciar sesión</h2>
            <label>
              Email
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                }
                required
              />
            </label>
            <button type="submit" className="btn-primary full">
              Entrar
            </button>
          </form>

          <form className="account-card" onSubmit={handleRegister}>
            <h2>Crear cuenta</h2>
            <label>
              Nombre
              <input
                type="text"
                value={registerForm.name}
                onChange={(event) =>
                  setRegisterForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Teléfono
              <input
                type="tel"
                value={registerForm.phone}
                onChange={(event) =>
                  setRegisterForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                }
                required
              />
            </label>
            <button type="submit" className="btn-primary full">
              Registrarme
            </button>
          </form>
        </div>
        {message && <p className="feedback-ok">{message}</p>}
      </div>
    );
  }

  return (
    <div className="container section-space account-page">
      <header className="section-title">
        <p>Mi cuenta</p>
        <h1>Hola, {currentUser.name}</h1>
        <span>Gestioná tus datos, direcciones y pedidos.</span>
      </header>

      <div className="account-user-grid">
        <form className="account-card" onSubmit={saveProfile}>
          <h2>Mis datos</h2>
          <label>
            Nombre
            <input
              type="text"
              value={profile.name}
              onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label>
            Teléfono
            <input
              type="tel"
              value={profile.phone}
              onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </label>
          <label>
            Email
            <input type="email" value={profile.email} readOnly />
          </label>
          <div className="addresses">
            <h3>Mis direcciones</h3>
            <ul>
              {(profile.addresses || []).map((address) => (
                <li key={address}>{address}</li>
              ))}
            </ul>
            <div className="address-add">
              <input
                type="text"
                value={newAddress}
                onChange={(event) => setNewAddress(event.target.value)}
                placeholder="Agregar dirección"
              />
              <button type="button" onClick={addAddress}>
                Agregar
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary full">
            Guardar cambios
          </button>
          <button type="button" className="btn-outline full" onClick={logout}>
            Cerrar sesión
          </button>
        </form>

        <section className="account-card">
          <h2>Mis pedidos</h2>
          {!myOrders.length ? (
            <p>Aún no tenés pedidos registrados.</p>
          ) : (
            <ul className="my-orders-list">
              {myOrders.map((order) => (
                <li key={order.number}>
                  <div>
                    <b>Pedido #{order.number}</b>
                    <small>{formatCompactDate(order.createdAt)}</small>
                  </div>
                  <div>
                    <b>{formatCurrency(order.totals.total)}</b>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {message && <p className="feedback-ok">{message}</p>}
    </div>
  );
}

export default AccountPage;
