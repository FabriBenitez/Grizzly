import { getPublicStockState } from "../../utils/stock";

export function getPromoProducts(products = [], limit = 6) {
  return products
    .filter((product) => product.promo)
    .sort((left, right) => Number(Boolean(right.highlighted)) - Number(Boolean(left.highlighted)))
    .slice(0, limit);
}

export function getComboProducts(products = [], limit = 6) {
  return products
    .filter((product) => product.combo)
    .sort((left, right) => Number(Boolean(right.highlighted)) - Number(Boolean(left.highlighted)))
    .slice(0, limit);
}

export function getMostSoldProducts(products = [], limit = 6) {
  return [...products]
    .sort(
      (left, right) =>
        Number(Boolean(right.highlighted)) - Number(Boolean(left.highlighted)) ||
        (right.sold || 0) - (left.sold || 0),
    )
    .slice(0, limit);
}

export function getHighlightedProducts(products = [], limit = 6) {
  return products
    .filter((product) => product.highlighted || product.featured)
    .sort((left, right) => (right.sold || 0) - (left.sold || 0))
    .slice(0, limit);
}

export function getStockState(stock = 0) {
  return getPublicStockState(stock);
}

export function getRelatedProducts(products = [], currentProduct, limit = 4) {
  if (!currentProduct) {
    return [];
  }

  return products
    .filter((product) => product.category === currentProduct.category && product.id !== currentProduct.id)
    .slice(0, limit);
}
