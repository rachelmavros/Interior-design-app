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
  /** clear: what to remove and what belongs behind it. add/blend: the item. */
  text?: string;
  style?: string;
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

export interface InspoPhoto {
  id: string;
  /** Grid-size image. */
  src: string;
  /** Larger image for shopping. */
  full: string;
  width: number;
  height: number;
  color: string;
  alt: string;
  author: string;
  authorUrl: string;
  sourceUrl: string;
  /** Unsplash's "this photo was used" endpoint. */
  useUrl?: string;
  /** Where the photo comes from, for the credit line. */
  provider: 'unsplash' | 'pinterest';
}

export interface Magazine {
  name: string;
  home: string;
  stories: Story[];
}

export interface Story {
  title: string;
  link: string;
  image?: string;
  date: string;
}
