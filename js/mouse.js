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
    left: '0px',
    top: '0px',
    width: '36px',                  // outer size
    height: '36px',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: '9999',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: `2px solid ${THEME_BLUE}`,  // ring
    opacity: '1',
    transition: 'transform .06s linear, opacity .15s ease, background-color .15s ease, border .15s ease'
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

  // Smooth follow
  let tx = 0, ty = 0, x = 0, y = 0;
  const ease = 0.22;
  (function loop() {
    x += (tx - x) * ease;
    y += (ty - y) * ease;
    cursor.style.left = x + 'px';
    cursor.style.top  = y + 'px';
    requestAnimationFrame(loop);
  })();

  // Visual states
  const setDown = (down) => {
    if (down) {
      // PRESSED: filled circle
      cursor.style.backgroundColor = THEME_BLUE;
      cursor.style.border = 'none';
      cursor.style.scale = '0.94';
      dot.style.display = 'none';
    } else {
      // NORMAL: target (ring + dot)
      cursor.style.backgroundColor = 'transparent';
      cursor.style.border = `2px solid ${THEME_BLUE}`;
      cursor.style.scale = '1';
      dot.style.display = 'block';
    }
  };
  setDown(false);

  // Events
  window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; cursor.style.opacity = '1'; });
  window.addEventListener('mousedown', () => setDown(true));
  window.addEventListener('mouseup',   () => setDown(false));
  window.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
  window.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });

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
