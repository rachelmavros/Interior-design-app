'use client';

import { useRef, useState } from 'react';
import { IconPhotoUp } from '@tabler/icons-react';

/** Drag-and-drop or tap-to-pick photo input; on phones this offers the camera too. */
export function PhotoPicker({
  onFile,
  title = 'Upload a photo of your room',
  hint = 'JPG, PNG, HEIC or WEBP · straight-on, well-lit shots work best',
  busy,
}: {
  onFile: (f: File) => void;
  title?: string;
  hint?: string;
  busy?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      className={`dropzone ${over ? 'over' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => !busy && input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f && f.type.startsWith('image/')) onFile(f);
      }}
    >
      {busy ? <span className="spinner" style={{ margin: '0 auto' }} /> : <IconPhotoUp size={34} color="#b4552d" style={{ margin: '0 auto' }} />}
      <h3>{busy ? 'Preparing your photo…' : title}</h3>
      <p className="small muted">{hint}</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
