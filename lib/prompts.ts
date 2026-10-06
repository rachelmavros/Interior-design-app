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
- Photorealistic only: no illustration, CGI sheen, HDR look, text, watermarks, people or pets.
- The image may be a close-up crop of a larger room photo. Treat it as the same photograph and keep everything consistent with it.`;

const CLEAR = (request?: string) => `${PRESERVE}

Task: act as a professional magic eraser on the masked region.
${
  request?.trim()
    ? `The user's request, which takes priority on what to remove and what belongs behind it: "${request.trim()}"`
    : 'Remove the furniture, decor and loose objects in the masked region.'
}
Remove those objects completely, including any shadows, reflections and cast light that come from them.

Then rebuild what the camera would have seen if they had never been there:
- Complete everything that was partly hidden. Continue cabinets, cabinet doors and drawers, countertops, toe kicks, shelving, built-ins, wainscoting, baseboards, trim, windows, radiators, wall surfaces and floor patterns through the removed area — matching their existing style, material, color, hardware, panel sizes, spacing and alignment, and following the room's perspective lines and vanishing points.
- Infer hidden parts from the visible parts: if a run of cabinets disappears behind the removed object, continue the same cabinets with the same doors and handles until they meet the next visible element; if flooring runs underneath, continue the same planks or tiles with correct alignment and grout lines.
- The rebuilt area must be as sharp and detailed as the rest of the photo — no smudges, blur, ghost outlines, flat patches or obviously repeated texture.

The result must look like this same room photographed at the same moment without what was removed. Do not add new furniture, rugs, plants, art or decor, and do not repaint, re-texture or reshape any wall, floor, cabinet or window beyond completing what was hidden.`;

const ADD = (item: string, style?: string) => `${PRESERVE}

Task: place ${/^(a|an|the|some|two|three|\d)\b/i.test(item.trim()) ? item.trim() : `a ${item.trim()}`} in the room, inside the masked region${style ? `, in a ${style} interior style` : ''}.
- Size comes first. Give the piece its true real-world dimensions for this room, judged against the doors, windows, ceiling height, outlets and existing furniture (a standard door is about 80 in / 203 cm tall, a sofa seat about 18 in / 46 cm high, a three-seat sofa about 84 in / 213 cm wide). The masked region only marks where it may go and is usually bigger than the piece: do not stretch, enlarge or crop the piece to fill it.
- Keep the entire piece visible with a clear margin of empty floor or wall between it and every edge of the masked region. Nothing may touch or be cut off by the mask edge.
- It must be one real, purchasable-looking product with real-world materials, proportions and construction — like a listing from a major furniture retailer. No fantasy, sculptural or impossible designs.
- Render it solid and fully opaque with crisp, sharp detail and true-to-life color and contrast — never translucent, ghosted, faded, washed out or blended into the background.
- Ground it physically: correct perspective for the camera, resting on the floor or mounted on the wall as appropriate, lit from the room's existing light sources with soft, consistent contact shadows.
- Fill the rest of the masked region with the existing floor or wall, continued seamlessly.`;

const BLEND = (item?: string) => `${PRESERVE}

Task: the first image is the room with a product photo roughly pasted into the masked region. The second image is the reference photo of that exact product${item ? ` (${item.trim()})` : ''}.
Re-render the product in place so it looks physically present in the room: match the room's perspective and camera angle, scale, lighting direction and color temperature; add soft contact shadows and ambient occlusion where it meets the floor or wall; remove any cut-out edges, halos or leftover background from the paste.
Keep the product's design identical to the reference — same silhouette, proportions, color, material, fabric, legs, hardware and details. Do not redesign, restyle or substitute it. Keep it at the same position and footprint inside the masked region.`;

export function buildPrompt(p: EditParams): string {
  switch (p.mode) {
    case 'clear':
      return CLEAR(p.text);
    case 'add':
      return ADD(p.text || 'a piece of furniture', p.style);
    case 'blend':
      return BLEND(p.text);
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
