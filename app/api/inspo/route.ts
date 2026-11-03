import { guard, isMock, json } from '@/lib/server/guard';
import { mockInspo } from '@/lib/server/mock';
import { searchPhotos } from '@/lib/server/unsplash';

export const maxDuration = 30;

export async function GET(req: Request) {
  const blocked = guard(req, 'inspo', 40);
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().slice(0, 120) || 'interior design';
  const page = Math.max(0, Math.min(19, parseInt(searchParams.get('page') || '0', 10) || 0));

  if (isMock()) return json({ photos: mockInspo(q, page), hasMore: page < 3 });

  try {
    return json(await searchPhotos(q, page));
  } catch (e) {
    console.error('inspo', e);
    return json({ error: (e as Error).message || 'Could not load photos' }, 502);
  }
}
