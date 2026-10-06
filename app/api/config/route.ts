import { isMock } from '@/lib/server/guard';
import type { AppConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

export function GET() {
  const missing = ['SERP_KEY', 'IMGBB_KEY', 'OPENAI_API_KEY'].filter((k) => !process.env[k]);
  const body: AppConfig = {
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
    mock: isMock(),
    accessRequired: Boolean(process.env.APP_ACCESS_CODE),
    missing: isMock() ? [] : missing,
  };
  return Response.json(body);
}
