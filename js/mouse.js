/*===========CUSTOM CURSOR===========*/
document.addEventListener('DOMContentLoaded', () => {
  // Show on wide screens only (same rule you used)
  if (window.innerWidth < 1000) return;

  // Use your theme blue if present, else fallback
  const THEME_BLUE =
    getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#1D38B9';

  // Beat any CSS `cursor: url(...) !important`
  document.documentElement.style.setProperty('cursor', 'none', 'important');
  document.body.style.setProperty('cursor', 'none', 'important');

  // --- outer ring ---
  const cursor = document.createElement('div');
  Object.assign(cursor.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '36px',                  // outer size
    height: '36px',
    boxSizing: 'border-box', 
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: '9999',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: `2px solid ${THEME_BLUE}`,  // ring
    opacity: '1',
    transition: 'opacity .15s ease, background-color .15s ease, border .15s ease',
    willChange: 'transform'
  });

  // --- inner dot (the “target” center) ---
  const dot = document.createElement('div');
  Object.assign(dot.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '12px',                  // center dot size
    height: '12px',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    background: THEME_BLUE,
    pointerEvents: 'none'
  });

  cursor.appendChild(dot);
  document.body.appendChild(cursor);

  // Track pointer position
  let mouseX = -100,
    mouseY = -100;

  window.addEventListener(
    'pointermove',
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.opacity = '1';
    },
    { passive: true, capture: true }
  );

  // Update cursor once per animation frame for smoother motion
  const update = () => {
    cursor.style.transform =
      `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);

  window.addEventListener('pointerdown', () => setDown(true));
  window.addEventListener('pointerup', () => setDown(false));
  window.addEventListener('pointerleave', () => {
    cursor.style.opacity = '0';
  });
  window.addEventListener('pointerenter', () => {
    cursor.style.opacity = '1';
  });

  // Optional: show native caret on text fields
  document.addEventListener('mouseover', (e) => {
    const onText = e.target.closest('input, textarea, [contenteditable="true"]');
    if (onText) {
      cursor.style.display = 'none';
      document.documentElement.style.cursor = '';
      document.body.style.cursor = 'text';
    } else {
      cursor.style.display = 'block';
      document.documentElement.style.setProperty('cursor', 'none', 'important');
      document.body.style.setProperty('cursor', 'none', 'important');
    }
  });
});
