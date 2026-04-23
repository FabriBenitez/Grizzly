export function getEffectivePrice(product) {
  return product.promoPrice || product.price;
}

export function getDiscountPercent(product) {
  if (!product.promoPrice || product.promoPrice >= product.price) {
    return 0;
  }

  return Math.round(((product.price - product.promoPrice) / product.price) * 100);
}

export function filterProducts(products, filters) {
  const {
    query = "",
    category = "",
    brand = "",
    minPrice = "",
    maxPrice = "",
    promoOnly = false,
  } = filters;

  return products.filter((product) => {
    const normalizedQuery = query.trim().toLowerCase();
    const effectivePrice = getEffectivePrice(product);

    const matchesQuery =
      !normalizedQuery ||
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.category.toLowerCase().includes(normalizedQuery) ||
      product.brand.toLowerCase().includes(normalizedQuery);

    const matchesCategory = !category || product.category === category;
    const matchesBrand = !brand || product.brand === brand;
    const matchesPromo = !promoOnly || Boolean(product.promo);
    const matchesMin = minPrice === "" || effectivePrice >= Number(minPrice);
    const matchesMax = maxPrice === "" || effectivePrice <= Number(maxPrice);

    return matchesQuery && matchesCategory && matchesBrand && matchesPromo && matchesMin && matchesMax;
  });
}

export function sortProducts(products, sortBy) {
  const sorted = [...products];

  switch (sortBy) {
    case "priceAsc":
      return sorted.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    case "priceDesc":
      return sorted.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    case "mostSold":
      return sorted.sort((a, b) => b.sold - a.sold);
    case "promos":
      return sorted.sort((a, b) => Number(b.promo) - Number(a.promo));
    default:
      return sorted;
  }
}
