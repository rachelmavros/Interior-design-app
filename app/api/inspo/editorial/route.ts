import { isMock, json } from '@/lib/server/guard';
import { magazineRows } from '@/lib/server/editorial';
import { mockMagazines } from '@/lib/server/mock';

export async function GET() {
  if (isMock()) return json({ magazines: mockMagazines() });
  try {
    const magazines = await magazineRows();
    return Response.json({ magazines }, { headers: { 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch (e) {
    console.error('editorial', e);
    return json({ magazines: [] });
  }
}
