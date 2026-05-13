export function getPromoProducts(products = [], limit = 6) {
  return products.filter((product) => product.promo).slice(0, limit);
}

export function getComboProducts(products = [], limit = 6) {
  return products.filter((product) => product.combo).slice(0, limit);
}

export function getMostSoldProducts(products = [], limit = 6) {
  return [...products].sort((left, right) => (right.sold || 0) - (left.sold || 0)).slice(0, limit);
}

export function getHighlightedProducts(products = [], limit = 6) {
  return products.filter((product) => product.highlighted).slice(0, limit);
}

export function getStockState(stock = 0) {
  if (stock > 20) {
    return {
      label: "Stock disponible",
      tone: "ok",
    };
  }

  if (stock > 8) {
    return {
      label: "Ultimas unidades",
      tone: "warn",
    };
  }

  return {
    label: "Stock bajo",
    tone: "alert",
  };
}

export function getRelatedProducts(products = [], currentProduct, limit = 4) {
  if (!currentProduct) {
    return [];
  }

  return products
    .filter((product) => product.category === currentProduct.category && product.id !== currentProduct.id)
    .slice(0, limit);
}
