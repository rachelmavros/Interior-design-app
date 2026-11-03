import { isMock, json } from '@/lib/server/guard';
import { latestStories } from '@/lib/server/editorial';
import { mockStories } from '@/lib/server/mock';

export async function GET() {
  if (isMock()) return json({ stories: mockStories() });
  try {
    const stories = await latestStories();
    return Response.json({ stories }, { headers: { 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch (e) {
    console.error('editorial', e);
    return json({ stories: [] });
  }
}
