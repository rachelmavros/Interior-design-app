export type Quality = 'low' | 'medium' | 'high';

export interface ImageModel {
  id: string;
  label: string;
  blurb: string;
  /** Approximate USD per output image, OpenAI list price. [square, landscape/portrait] */
  cost: Record<Quality, [number, number]>;
}

/** Prices change; these are estimates for showing users relative cost. */
export const IMAGE_MODELS: ImageModel[] = [
  {
    id: 'gpt-image-1-mini',
    label: 'Budget',
    blurb: 'Cheapest and fastest. Great for trying ideas.',
    cost: { low: [0.005, 0.006], medium: [0.011, 0.015], high: [0.036, 0.052] },
  },
  {
    id: 'gpt-image-1.5',
    label: 'Balanced',
    blurb: 'Better detail and instruction-following for a moderate price.',
    cost: { low: [0.009, 0.013], medium: [0.034, 0.05], high: [0.133, 0.2] },
  },
  {
    id: 'gpt-image-2',
    label: 'Premium',
    blurb: 'Best realism and best at keeping the room intact.',
    cost: { low: [0.015, 0.022], medium: [0.061, 0.09], high: [0.219, 0.33] },
  },
];

export const DEFAULT_MODEL = 'gpt-image-1-mini';
export const DEFAULT_QUALITY: Quality = 'low';

export type AiMode = 'clear' | 'add';

/** Starting picks per task, from real testing: Balanced rebuilds hidden areas best; Premium Draft places pieces best. */
export const MODE_DEFAULTS: Record<AiMode, { model: string; quality: Quality }> = {
  clear: { model: 'gpt-image-1.5', quality: 'medium' },
  add: { model: 'gpt-image-2', quality: 'low' },
};

export function estimateCost(modelId: string, quality: Quality, square: boolean) {
  const m = IMAGE_MODELS.find((x) => x.id === modelId);
  if (!m) return null;
  return m.cost[quality][square ? 0 : 1];
}

export function formatCost(usd: number | null) {
  if (usd === null) return '';
  if (usd < 0.01) return '<1¢';
  if (usd < 1) return `~${Math.round(usd * 100)}¢`;
  return `~$${usd.toFixed(2)}`;
}
