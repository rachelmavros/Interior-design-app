import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = { title: 'Privacy policy — Room to Shop' };

const UPDATED = 'November 4, 2026';

export default function Privacy() {
  const contact = process.env.CONTACT_EMAIL;
  return (
    <>
      <SiteHeader />
      <main className="page legal">
        <h1 className="display">Privacy policy</h1>
        <p className="muted small">Last updated {UPDATED}</p>

        <h2>The short version</h2>
        <p>
          There are no accounts. Your room photos and designs are saved in your own browser, not on our servers. When you use
          an AI edit or a visual search, the image needed for that request is sent to the service that performs it, and nothing
          is kept by us afterward.
        </p>

        <h2>What stays on your device</h2>
        <p>
          Projects, room photos, edit history, placed products and your AI model preference are stored in your browser’s local
          storage (IndexedDB and localStorage). Clearing your browser data or deleting a project removes them. We can’t see or
          recover them.
        </p>

        <h2>What we send to other services, and why</h2>
        <ul>
          <li>
            <strong>AI edits — OpenAI.</strong> When you run an edit, your room photo, the area you painted, your text
            description and, for “Blend”, the product photo are sent to OpenAI to generate the result. OpenAI’s{' '}
            <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer">privacy policy</a> and API data
            terms apply; under those terms, API data is not used to train their models by default.
          </li>
          <li>
            <strong>Visual search — imgBB and SerpAPI (Google Lens).</strong> When you search a selection, only that cropped
            area is uploaded to imgBB as a temporary link set to expire after 10 minutes, and that link is sent through SerpAPI
            to Google Lens to find matching products.
          </li>
          <li>
            <strong>Store search — SerpAPI (Google Shopping).</strong> The words you search for are sent to find products.
          </li>
          <li>
            <strong>Inspo — SerpAPI (Google Images) and Unsplash.</strong> The words and filters you search with are sent to
            find inspiration photos. Photos you heart are saved only in your browser.
          </li>
          <li>
            <strong>Links you paste.</strong> Our server opens the page to read its product photo, title and price.
          </li>
        </ul>

        <h2>Our servers</h2>
        <p>
          The site is hosted on Vercel. Requests pass through our server functions and are not stored by us. Your IP address is
          held briefly in memory to limit abuse (rate limiting), and our host may keep standard request logs for security and
          debugging.
        </p>

        <h2>Shopping links and commissions</h2>
        <p>
          Some product links are affiliate links. If you click one and buy something, we may earn a commission at no extra cost to
          you. When you click, the retailer or affiliate network (for example Amazon Associates, Sovrn or Skimlinks) may set cookies
          to credit the referral. Their privacy policies govern that data.
        </p>

        <h2>What we don’t do</h2>
        <p>We don’t sell your personal information, run ads, or build profiles about you.</p>

        <h2 id="copyright">Copyright and photo removal</h2>
        <p>
          The Inspo page shows search previews of photos found on Pinterest and other sites, each credited and linked to its
          source, as well as licensed photos from Unsplash. Those photos belong to their owners. We don’t host them and don’t
          use them for shopping.
        </p>
        <p>
          If you own a photo and want it removed, or believe something here infringes your copyright, send a notice
          {contact ? (
            <>
              {' '}
              to <a href={`mailto:${contact}?subject=Copyright%20notice`}>{contact}</a>
            </>
          ) : (
            ' using the contact address on this page'
          )}{' '}
          with: the photo or work concerned, the link or search where it appears here, your contact details, a statement that you
          believe in good faith the use isn’t authorized, a statement that the notice is accurate and that you are the owner or
          authorized to act for them, and your physical or electronic signature. We remove reported photos promptly.
        </p>

        <h2>Children</h2>
        <p>This site isn’t directed at children under 13, and we don’t knowingly collect their information.</p>

        <h2>Changes</h2>
        <p>If this policy changes, we’ll update the date at the top of this page.</p>

        {contact && (
          <>
            <h2>Contact</h2>
            <p>
              Questions? Email <a href={`mailto:${contact}`}>{contact}</a>.
            </p>
          </>
        )}
      </main>
    </>
  );
}
