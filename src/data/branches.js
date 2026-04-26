export const MOCK_BRANCHES = [
  {
    id: "ca-01",
    name: "Sucursal Adrogué",
    city: "Adrogué",
    province: "Buenos Aires",
    address: "Seguí 690",
    postalCode: "1846",
    hours: "Lunes a Viernes 09:00 a 18:00 - Sábados 09:00 a 13:00"
  },
  {
    id: "ca-02",
    name: "Sucursal Lomas de Zamora",
    city: "Lomas de Zamora",
    province: "Buenos Aires",
    address: "Leandro N. Alem 150",
    postalCode: "1832",
    hours: "Lunes a Viernes 08:30 a 18:30"
  },
  {
    id: "ca-03",
    name: "Sucursal Quilmes",
    city: "Quilmes",
    province: "Buenos Aires",
    address: "Guido 120",
    postalCode: "1878",
    hours: "Lunes a Viernes 09:00 a 18:00"
  },
  {
    id: "ca-04",
    name: "Sucursal Lanús",
    city: "Lanús",
    province: "Buenos Aires",
    address: "Av. 25 de Mayo 120",
    postalCode: "1824",
    hours: "Lunes a Viernes 09:00 a 18:00"
  }
];

export const obtenerSucursalesCorreoArgentino = async ({ localidad, codigoPostal }) => {
  // Simula una llamada a API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_BRANCHES);
    }, 500);
  });
};