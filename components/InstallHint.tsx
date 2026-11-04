'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { IconDeviceMobilePlus, IconDots, IconShare2, IconX } from '@tabler/icons-react';

type Platform = 'iphone' | 'android';

const HIDE_KEY = 'rts-install-hint-hidden';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}

function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** Corner button with add-to-home-screen steps for iPhone and Android. */
export function InstallHint() {
  const path = usePathname();
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>('iphone');
  const [installer, setInstaller] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    let hidden = false;
    try {
      hidden = localStorage.getItem(HIDE_KEY) === '1';
    } catch {}
    if (hidden || standalone()) return;
    setPlatform(/android/i.test(navigator.userAgent) ? 'android' : 'iphone');
    setShow(true);
    // Chrome on Android can install in one tap when it offers this event.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstaller(e as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  // The studio's controls sit along the bottom of the screen; keep the corner clear there.
  if (!show || path.startsWith('/studio')) return null;

  function hide() {
    try {
      localStorage.setItem(HIDE_KEY, '1');
    } catch {}
    setShow(false);
  }

  return (
    <div className="install-hint">
      {open && (
        <div className="install-card" role="dialog" aria-labelledby="install-title">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong id="install-title">Add to your home screen</strong>
            <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
              <IconX size={16} />
            </button>
          </div>
          <div className="segmented" style={{ margin: '10px 0' }}>
            <button className={platform === 'iphone' ? 'on' : ''} onClick={() => setPlatform('iphone')}>
              iPhone
            </button>
            <button className={platform === 'android' ? 'on' : ''} onClick={() => setPlatform('android')}>
              Android
            </button>
          </div>
          {platform === 'iphone' ? (
            <ol className="install-steps">
              <li>
                Open this page in <strong>Safari</strong>.
              </li>
              <li>
                Tap the <strong>Share</strong> button <IconShare2 size={14} /> at the bottom of the screen.
              </li>
              <li>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong>.
              </li>
            </ol>
          ) : (
            <>
              {installer && (
                <button
                  className="btn btn-accent btn-sm btn-block"
                  style={{ marginBottom: 10 }}
                  onClick={async () => {
                    await installer.prompt();
                    setInstaller(null);
                  }}
                >
                  Install now
                </button>
              )}
              <ol className="install-steps">
                <li>
                  Open this page in <strong>Chrome</strong>.
                </li>
                <li>
                  Tap the <strong>menu</strong> <IconDots size={14} style={{ transform: 'rotate(90deg)' }} /> at the top right.
                </li>
                <li>
                  Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>).
                </li>
                <li>
                  Tap <strong>Install</strong> or <strong>Add</strong>.
                </li>
              </ol>
            </>
          )}
          {platform === 'iphone' && (
            <p className="tiny muted" style={{ margin: '8px 0 0' }}>
              On iPhone, the home-screen app keeps its own rooms and saves, separate from Safari.
            </p>
          )}
          <button className="link-btn tiny" style={{ marginTop: 8 }} onClick={hide}>
            Don’t show this again
          </button>
        </div>
      )}
      <button className="install-fab" aria-label="Add to home screen" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <IconDeviceMobilePlus size={20} />
      </button>
    </div>
  );
}
