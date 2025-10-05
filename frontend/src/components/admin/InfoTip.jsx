// Shared InfoTip component with smart flip and optional multiline wrapping
import React from 'react';

/**
 * Props:
 *  text: string (required)
 *  wrap?: boolean (allow multiline wrapping instead of nowrap)
 *  maxWidth?: number (override default 320)
 */
export default function InfoTip({ text, wrap = false, maxWidth = 320 }) {
  const [open, setOpen] = React.useState(false);
  const [placement, setPlacement] = React.useState('right'); // right | left | bottom
  const btnRef = React.useRef(null);
  const tipRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const compute = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const vw = window.innerWidth || document.documentElement.clientWidth || 0;
      const margin = 12;
      // Measure actual tooltip width if rendered, else estimate
      let estWidth = 240;
      if (tipRef.current) {
        const cr = tipRef.current.getBoundingClientRect();
        estWidth = cr.width;
      } else {
        estWidth = Math.min(maxWidth, Math.max(160, text.length * 6));
      }
      if (rect.right + margin + estWidth < vw) setPlacement('right');
      else if (rect.left - margin - estWidth > 0) setPlacement('left');
      else setPlacement('bottom');
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open, text, maxWidth]);

  const baseStyle = {
    position: 'absolute',
    background: '#0f172a',
    color: '#e2e8f0',
    padding: '8px 10px',
    borderRadius: 6,
    fontSize: 12,
    zIndex: 9999,
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    maxWidth,
    whiteSpace: wrap ? 'normal' : 'nowrap',
    lineHeight: 1.35,
  };
  const styleByPlacement = placement === 'right'
    ? { top: '50%', left: 'calc(100% + 8px)', transform: 'translateY(-50%)' }
    : placement === 'left'
      ? { top: '50%', right: 'calc(100% + 8px)', transform: 'translateY(-50%)' }
      : { top: '120%', left: '50%', transform: 'translateX(-50%)' };

  return (
    <span style={{ display: 'inline-block', position: 'relative', marginLeft: 6 }}>
      <button
        ref={btnRef}
        type="button"
        aria-label="Help"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        style={{
          width: 18,
          height: 18,
          lineHeight: '18px',
          textAlign: 'center',
          borderRadius: '50%',
          border: '1px solid #94a3b8',
          background: '#e2e8f0',
          color: '#0f172a',
          fontSize: 11,
          padding: 0,
          cursor: 'help'
        }}
      >
        ?
      </button>
      {open && (
        <div ref={tipRef} role="tooltip" style={{ ...baseStyle, ...styleByPlacement }}>
          {text}
        </div>
      )}
    </span>
  );
}
