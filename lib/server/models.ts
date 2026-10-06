import { DEFAULT_MODEL, IMAGE_MODELS } from '../models';

export function allowedModels(): string[] {
  const env = process.env.OPENAI_ALLOWED_MODELS?.split(',').map((s) => s.trim()).filter(Boolean);
  return env?.length ? env : IMAGE_MODELS.map((m) => m.id);
}

export function defaultModel(): string {
  const allowed = allowedModels();
  const wanted = process.env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL;
  return allowed.includes(wanted) ? wanted : allowed[0];
}
