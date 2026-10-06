import type { EditParams } from './types';

/**
 * Every edit is pixel-composited back through the mask on the client, so the
 * room outside the mask is guaranteed unchanged. These prompts make the
 * generated pixels *inside* the mask agree with that untouched room.
 */
const PRESERVE = `You are editing a real photograph of a room for an interior design visualization. This is a localized photo edit, not a new image.

Hard rules — never break these:
- Architecture is fixed. Walls, wall positions and angles, corners, ceiling, floor plane, windows and window frames, doors and doorways, trim, baseboards, crown molding, built-ins, columns, stairs, radiators, vents, outlets, switches and fixed light fixtures keep their exact position, size, shape, material and color.
- Camera is fixed. Same viewpoint, lens, field of view, perspective, vanishing points and framing. Do not crop, zoom, rotate, straighten, widen or re-frame.
- Light is fixed. Keep the original light direction, color temperature, exposure, white balance, contrast, shadows and sensor grain so new pixels blend invisibly with the original photo.
- Only change the transparent masked region. Everything outside it must look untouched.
- Photorealistic only: no illustration, CGI sheen, HDR look, text, watermarks, people or pets.`;

const CLEAR = (what?: string) => `${PRESERVE}

Task: remove ${what?.trim() ? what.trim() : 'all furniture, decor and loose objects'} inside the masked region.
Reconstruct exactly what is behind the removed objects: continue the existing floor material (same color, pattern, plank direction and width, tile grout lines), the baseboards and the wall surface seamlessly, following the room's perspective lines. Remove their shadows and reflections too.
The result must look like this same room, emptied, photographed in the same moment. Do not add anything — no rugs, plants, furniture, art or decor — and do not repaint, re-texture or reshape any wall, floor or window.`;

const ADD = (item: string, style?: string) => `${PRESERVE}

Task: place ${item.trim()} in the masked region${style ? `, in a ${style} interior style` : ''}.
- It must be one real, purchasable-looking product with real-world materials, proportions and construction — like a listing from a major furniture retailer. No fantasy, sculptural or impossible designs.
- Ground it physically: correct perspective and scale for this room (a standard door is about 80 in / 203 cm tall, a seat is about 18 in / 46 cm high, an outlet is about 12 in / 30 cm off the floor), resting on the floor or mounted on the wall as appropriate.
- Light it from the room's existing light sources with soft, consistent contact shadows and occlusion on the floor and nearby wall.
- Keep the whole object inside the masked region; fill any leftover masked area with the existing floor or wall, continued seamlessly.`;

const BLEND = (item?: string) => `${PRESERVE}

Task: the first image is the room with a product photo roughly pasted into the masked region. The second image is the reference photo of that exact product${item ? ` (${item.trim()})` : ''}.
Re-render the product in place so it looks physically present in the room: match the room's perspective and camera angle, scale, lighting direction and color temperature; add soft contact shadows and ambient occlusion where it meets the floor or wall; remove any cut-out edges, halos or leftover background from the paste.
Keep the product's design identical to the reference — same silhouette, proportions, color, material, fabric, legs, hardware and details. Do not redesign, restyle or substitute it. Keep it at the same position and footprint inside the masked region.`;

const CUSTOM = (instruction: string) => `${PRESERVE}

Task, applied only inside the masked region: ${instruction.trim()}
If the instruction conflicts with the hard rules above, follow the hard rules. Repainting or re-surfacing a wall or floor is allowed when asked, but its geometry, outlets, trim and fixtures must stay exactly where they are.`;

export function buildPrompt(p: EditParams): string {
  switch (p.mode) {
    case 'clear':
      return CLEAR(p.text);
    case 'add':
      return ADD(p.text || 'a piece of furniture', p.style);
    case 'blend':
      return BLEND(p.text);
    case 'custom':
      return CUSTOM(p.text || '');
  }
}

export const STYLES = [
  'Modern',
  'Mid-century modern',
  'Scandinavian',
  'Japandi',
  'Minimalist',
  'Coastal',
  'Boho',
  'Industrial',
  'Traditional',
  'Modern farmhouse',
  'Art deco',
  'Maximalist',
];

export const QUICK_ITEMS = [
  'Sofa',
  'Sectional',
  'Accent chair',
  'Coffee table',
  'Area rug',
  'Floor lamp',
  'Side table',
  'Bed',
  'Dining table',
  'Sideboard',
  'Bookshelf',
  'Large plant',
  'Wall art',
  'Curtains',
  'Mirror',
  'Pendant light',
];
