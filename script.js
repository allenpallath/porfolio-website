/* ============================================================
   Reusable helpers
   ============================================================ */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* Generic eased tween — drives any per-frame value animation */
function animateValue({ from = 0, to, duration = 1000, ease = t => t, onUpdate, onDone }) {
  const start = performance.now();
  (function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    onUpdate(from + (to - from) * ease(p));
    if (p < 1) requestAnimationFrame(tick);
    else if (onDone) onDone();
  })(start);
}

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

/* ============================================================
   Page loader — fades out once the page finishes loading
   ============================================================ */
(function initLoader() {
  const loader = $('#loader');
  if (!loader) return;
  const pctEl = $('.loader-pct', loader);
  const MIN_DISPLAY = 1500; // keep the loader up for at least 1.5s
  const started = performance.now();
  let pct = 0;
  let finished = false;

  // Creep the counter toward 90% (setInterval keeps ticking even in background tabs)
  const ticker = setInterval(() => {
    pct = Math.min(pct + Math.random() * 9, 90);
    if (pctEl) pctEl.textContent = Math.floor(pct);
  }, 120);

  function finish() {
    if (finished) return;
    finished = true;
    clearInterval(ticker);
    if (pctEl) pctEl.textContent = '100';
    loader.classList.add('done');
    document.body.classList.remove('loading');
    const remove = () => loader.remove();
    loader.addEventListener('transitionend', remove, { once: true });
    setTimeout(remove, 900); // fallback if transitionend doesn't fire
  }

  window.addEventListener('load', () => {
    setTimeout(finish, Math.max(0, MIN_DISPLAY - (performance.now() - started)));
  });
  // Safety net: never let the loader trap the page
  setTimeout(finish, 5000);
})();

/* ============================================================
   Custom cursor
   ============================================================ */
const dot = $('.cursor-dot');
const ring = $('.cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

window.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  dot.style.left = mx + 'px';
  dot.style.top = my + 'px';
});

(function cursorLoop() {
  rx += (mx - rx) * 0.18;
  ry += (my - ry) * 0.18;
  ring.style.left = rx + 'px';
  ring.style.top = ry + 'px';
  requestAnimationFrame(cursorLoop);
})();

$$('a, button, .skill-row, .project-visual, .fact-row, .exp-item').forEach(el => {
  el.addEventListener('mouseenter', () => ring.classList.add('hover'));
  el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
});

/* ============================================================
   Mobile menu
   ============================================================ */
const menuBtn = $('#menu-btn');
const mobileMenu = $('#mobile-menu');

function setMenu(open) {
  menuBtn.classList.toggle('open', open);
  mobileMenu.classList.toggle('open', open);
  document.body.classList.toggle('menu-locked', open);
  menuBtn.setAttribute('aria-expanded', open);
  mobileMenu.setAttribute('aria-hidden', !open);
}

menuBtn.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));
$$('a', mobileMenu).forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && mobileMenu.classList.contains('open')) setMenu(false);
});

/* ============================================================
   Canvas background
   ============================================================ */
const canvas = $('#code-bg');
const ctx = canvas.getContext('2d');
const DPR = Math.min(devicePixelRatio, 1.5); // cap to limit fill cost on hi-DPI screens
const CONNECTION_DIST = 180 * DPR;
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let W, H;

function resize() {
  W = canvas.width = window.innerWidth * DPR;
  H = canvas.height = window.innerHeight * DPR;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
resize();
window.addEventListener('resize', resize);

const symbols = ['{', '}', '<', '/>', '()', '=>', '[]', '=', ';', '&&', '||', '++', '...', '#', '$', '*', '?', '!', '::', '/*', '=='];
const codeBits = ['const', 'let', 'async', 'await', 'function', 'export', 'import', 'return', 'if', 'else', 'class', 'new', 'this', 'null', 'true', 'false'];
const rand = arr => arr[Math.floor(Math.random() * arr.length)];

const PARTICLE_COUNT = 38;
const particles = Array.from({ length: PARTICLE_COUNT }, () => {
  const isWord = Math.random() < 0.3;
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.25 * DPR,
    vy: (Math.random() - 0.5) * 0.25 * DPR,
    text: isWord ? rand(codeBits) : rand(symbols),
    size: (isWord ? 11 : 14) * DPR,
    opacity: Math.random() * 0.25 + 0.06,
    isWord,
    pulse: Math.random() * Math.PI * 2,
  };
});

let scrollY = 0;

function draw() {
  ctx.clearRect(0, 0, W, H);

  /* Grid */
  ctx.strokeStyle = 'rgba(244, 244, 245, 0.04)';
  ctx.lineWidth = 1;
  const grid = 60 * DPR;
  const offset = (scrollY * 0.3 * DPR) % grid;
  for (let x = 0; x < W; x += grid) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = -offset; y < H; y += grid) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  /* Connection lines */
  ctx.lineWidth = 0.5 * DPR;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < CONNECTION_DIST) {
        ctx.strokeStyle = `rgba(193, 255, 72, ${(1 - d / CONNECTION_DIST) * 0.10})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  /* Particles */
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy + Math.sin(p.pulse) * 0.04;
    p.pulse += 0.01;
    if (p.x < -50) p.x = W + 50;
    if (p.x > W + 50) p.x = -50;
    if (p.y < -50) p.y = H + 50;
    if (p.y > H + 50) p.y = -50;

    const isAccent = Math.floor(p.pulse * 100) % 200 < 30;
    ctx.fillStyle = isAccent
      ? `rgba(193, 255, 72, ${p.opacity * 1.4})`
      : `rgba(244, 244, 245, ${p.opacity})`;
    ctx.font = `${p.isWord ? '500' : '400'} ${p.size}px JetBrains Mono, monospace`;
    ctx.fillText(p.text, p.x, p.y);
  });

  rafId = requestAnimationFrame(draw);
}

let rafId = null;
function startDraw() { if (rafId === null) rafId = requestAnimationFrame(draw); }
function stopDraw() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

if (prefersReducedMotion) {
  // Honour reduced-motion: paint one static frame, no animation loop
  draw();
  stopDraw();
} else {
  startDraw();
  // Don't burn the main thread while the tab is in the background
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stopDraw() : startDraw();
  });
}

/* ============================================================
   Scroll-driven effects (single listener)
   ============================================================ */
const visuals = $$('.project-visual');
let scrollTicking = false;

window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
  if (scrollTicking || prefersReducedMotion) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    const vh = window.innerHeight;
    visuals.forEach(v => {
      const r = v.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        const progress = (vh - r.top) / (vh + r.height);
        v.style.transform = `translateY(${(progress - 0.5) * -30}px)`;
      }
    });
    scrollTicking = false;
  });
}, { passive: true });

/* ============================================================
   Intersection observer (reveals + counters)
   ============================================================ */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in-view');
    $$('[data-count]', e.target).forEach(animateCount);
  });
}, { threshold: 0.12 });

$$('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger, .split, .skill-row').forEach(el => io.observe(el));

function animateCount(el) {
  if (el.dataset.done) return;
  el.dataset.done = '1';
  animateValue({
    to: parseFloat(el.dataset.count),
    duration: 1800,
    ease: easeOutCubic,
    onUpdate: v => { el.textContent = Math.floor(v); },
  });
}

/* ============================================================
   Project card glow (cursor-tracked spotlight)
   ============================================================ */
visuals.forEach(v => {
  v.addEventListener('mousemove', e => {
    const r = v.getBoundingClientRect();
    v.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    v.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });
});

/* ============================================================
   Smooth scroll for anchor links
   ============================================================ */
$$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length > 1) {
      const t = $(id);
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    }
  });
});
