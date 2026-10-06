import { isMock } from '@/lib/server/guard';
import { allowedModels, defaultModel } from '@/lib/server/models';
import type { AppConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

export function GET() {
  const missing = ['SERP_KEY', 'IMGBB_KEY', 'OPENAI_API_KEY'].filter((k) => !process.env[k]);
  const body: AppConfig = {
    model: defaultModel(),
    models: allowedModels(),
    amazon: Boolean(process.env.AMAZON_ASSOCIATE_TAG),
    mock: isMock(),
    accessRequired: Boolean(process.env.APP_ACCESS_CODE),
    missing: isMock() ? [] : missing,
  };
  return Response.json(body);
}
