export interface Product {
  id: string;
  title: string;
  /** Outbound link, affiliate-wrapped when a program is configured. */
  link: string;
  source: string;
  sourceIcon?: string;
  thumbnail?: string;
  /** Larger image when the provider has one; best for cutouts. */
  image?: string;
  price: number | null;
  priceText?: string;
  oldPrice?: number | null;
  rating?: number | null;
  reviews?: number | null;
  inStock?: boolean | null;
  delivery?: string;
  origin: 'lens' | 'shopping' | 'link' | 'upload';
}

export interface ProductSearchResponse {
  products: Product[];
  suggestedQuery?: string;
  hasMore?: boolean;
  error?: string;
}

export type EditMode = 'clear' | 'add' | 'blend';

export interface EditParams {
  mode: EditMode;
  /** clear: what to remove. add/blend: the item. */
  text?: string;
  style?: string;
  /** add: the painted area is approximate; the piece may extend past it. */
  smart?: boolean;
}

export interface AppConfig {
  /** Default image model; `models` are the ones visitors may pick. */
  model: string;
  models: string[];
  amazon: boolean;
  mock: boolean;
  accessRequired: boolean;
  missing: string[];
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
