export interface ProductoCatalogo {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  objective: string;
  price: number;
  promoPrice?: number | null;
  transferPrice: number;
  rating: number;
  reviews: number;
  stock: number;
  sold: number;
  featured: boolean;
  promo: boolean;
  combo: boolean;
  image: string;
  gallery: string[];
  description: string;
}
