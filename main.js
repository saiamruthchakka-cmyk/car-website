/**
 * NOCTIS — Main Application Logic
 * Vanilla JavaScript implementation of premium scrollytelling, canvas scrubbing,
 * film grain generation, custom headlight cursor, hover accordion, and word-by-word reveal.
 */

(function () {
  'use strict';

  // Load config from window.NOCTIS_CONFIG
  const CONFIG = window.NOCTIS_CONFIG || {};

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    document.body.classList.add('reduced-motion');
  }

  // Detect mobile screen width (< 768px)
  let isMobile = window.innerWidth < 768;

  // Global Clamp Helper
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // Global Lerp Helper
  function lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  // Format frame index as 4-digit string: 1 -> "0001"
  function padIndex(num) {
    return String(num).padStart(4, '0');
  }

  /* ==========================================================================
     1. FILM GRAIN OVERLAY
     ========================================================================== */
  function initFilmGrain() {
    const canvas = document.getElementById('grain-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const tileSize = CONFIG.grain?.size || 160;

    // Create offscreen noise tile
    const offscreen = document.createElement('canvas');
    offscreen.width = tileSize;
    offscreen.height = tileSize;
    const offCtx = offscreen.getContext('2d');
    const imgData = offCtx.createImageData(tileSize, tileSize);
    const buffer32 = new Uint32Array(imgData.data.buffer);

    for (let i = 0; i < buffer32.length; i++) {
      // Flat noise: neutral grayscale noise
      const val = (Math.random() * 255) | 0;
      buffer32[i] = (255 << 24) | (val << 16) | (val << 8) | val;
    }
    offCtx.putImageData(imgData, 0, 0);

    // Resize full-screen canvas
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas, { passive: true });
    resizeCanvas();

    // Render grain shifting randomly ~8 times per second (every 125ms)
    let lastTime = 0;
    const interval = 1000 / (CONFIG.grain?.fps || 8);

    function loop(time) {
      if (time - lastTime >= interval) {
        lastTime = time;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const ptrn = ctx.createPattern(offscreen, 'repeat');
        if (ptrn) {
          ctx.save();
          // Shift pattern origin randomly
          const offsetX = (Math.random() * tileSize) | 0;
          const offsetY = (Math.random() * tileSize) | 0;
          ctx.translate(-offsetX, -offsetY);
          ctx.fillStyle = ptrn;
          ctx.fillRect(offsetX, offsetY, canvas.width + tileSize, canvas.height + tileSize);
          ctx.restore();
        }
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ==========================================================================
     2. CUSTOM CURSOR ("The Headlight", Desktop Only)
     ========================================================================== */
  function initCustomCursor() {
    // Only run if fine pointer device and reduced motion is disabled
    if (!window.matchMedia('(pointer: fine)').matches || prefersReducedMotion) {
      return;
    }

    const cursor = document.getElementById('headlight-cursor');
    const label = document.getElementById('cursor-label');
    if (!cursor || !label) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;
    let isVisible = false;
    let isMouseDown = false;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) {
        isVisible = true;
        cursor.style.opacity = '1';
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      isVisible = false;
      cursor.style.opacity = '0';
    });

    window.addEventListener('mousedown', () => {
      cursor.classList.add('is-down');
      setTimeout(() => {
        cursor.classList.remove('is-down');
      }, 120);
    });

    // Update hover target detection
    function updateHoverState(target) {
      const interactive = target ? target.closest('a, button, [role="button"], input, .swatch') : null;
      if (interactive) {
        cursor.classList.add('is-hovering');
        const customText = interactive.getAttribute('data-cursor') || 'VIEW';
        label.textContent = customText;
      } else {
        cursor.classList.remove('is-hovering');
      }
    }

    window.addEventListener('mouseover', (e) => {
      updateHoverState(e.target);
    }, { passive: true });

    // Cursor Lerp Animation Loop
    const lerpSpeed = CONFIG.cursor?.lerpSpeed || 0.18;
    function renderCursor() {
      currentX = lerp(currentX, mouseX, lerpSpeed);
      currentY = lerp(currentY, mouseY, lerpSpeed);

      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);
  }

  /* ==========================================================================
     3. NAVBAR HIDE / SHOW ON SCROLL
     ========================================================================== */
  function initNav() {
    const nav = document.getElementById('site-nav');
    if (!nav) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // Hide on scroll down, show on scroll up
          if (currentScrollY > 120 && currentScrollY > lastScrollY) {
            nav.classList.add('nav-hidden');
          } else {
            nav.classList.remove('nav-hidden');
          }
          lastScrollY = Math.max(0, currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ==========================================================================
     4. FRAME SEQUENCE MANAGER (Canvas Scrubbing Core)
     ========================================================================== */
  class CanvasScroller {
    constructor(options) {
      this.canvas = document.getElementById(options.canvasId);
      this.wrapper = document.getElementById(options.wrapperId);
      if (!this.canvas || !this.wrapper) return;

      this.ctx = this.canvas.getContext('2d');
      this.frameCount = options.frameCount;
      this.desktopPath = options.desktopPath;
      this.mobilePath = options.mobilePath;
      this.lerpSpeed = options.lerpSpeed || 0.15;
      this.onProgressUpdate = options.onProgressUpdate || null;
      this.onRedraw = options.onRedraw || null;

      this.frames = new Array(this.frameCount);
      this.loadedIndices = new Set();
      this.currentFrameFloat = 0;
      this.targetFrame = 0;
      this.lastRenderedFrame = -1;
      this.scrollProgress = 0;

      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.initCanvasSize();
      window.addEventListener('resize', () => {
        this.initCanvasSize();
        this.redraw(Math.round(this.currentFrameFloat));
      }, { passive: true });
    }

    initCanvasSize() {
      const rect = this.canvas.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
    }

    getFramePath(index) {
      const isMob = window.innerWidth < 768;
      const template = isMob ? this.mobilePath : this.desktopPath;
      return template.replace('{index}', padIndex(index));
    }

    // Preload a single frame with img.decode()
    preloadFrame(index) {
      if (this.frames[index - 1]) {
        return Promise.resolve(this.frames[index - 1]);
      }
      return new Promise((resolve) => {
        const img = new Image();
        img.src = this.getFramePath(index);
        img.decode()
          .then(() => {
            this.frames[index - 1] = img;
            this.loadedIndices.add(index - 1);
            resolve(img);
          })
          .catch(() => {
            // Fallback to onload if decode fails
            img.onload = () => {
              this.frames[index - 1] = img;
              this.loadedIndices.add(index - 1);
              resolve(img);
            };
            img.onerror = () => resolve(null);
          });
      });
    }

    // Find nearest loaded frame index to prevent any black/blank flashes
    getNearestLoadedFrame(targetIdx) {
      if (this.loadedIndices.has(targetIdx)) {
        return this.frames[targetIdx];
      }
      for (let delta = 1; delta < this.frameCount; delta++) {
        if (targetIdx - delta >= 0 && this.loadedIndices.has(targetIdx - delta)) {
          return this.frames[targetIdx - delta];
        }
        if (targetIdx + delta < this.frameCount && this.loadedIndices.has(targetIdx + delta)) {
          return this.frames[targetIdx + delta];
        }
      }
      return null;
    }

    // Render frame to canvas: cover-fit on landscape, contain-fit on portrait
    drawFrame(img) {
      if (!img || !img.width || !img.height) return;
      const cw = this.canvas.width;
      const ch = this.canvas.height;
      const imgRatio = img.width / img.height;
      const canvasRatio = cw / ch;

      this.ctx.fillStyle = CONFIG.tokens?.asphalt || '#07080A';
      this.ctx.fillRect(0, 0, cw, ch);

      let dw, dh, dx, dy;

      if (window.innerWidth >= window.innerHeight) {
        // Landscape: Cover-fit
        if (canvasRatio > imgRatio) {
          dw = cw;
          dh = cw / imgRatio;
        } else {
          dh = ch;
          dw = ch * imgRatio;
        }
        dx = (cw - dw) / 2;
        dy = (ch - dh) / 2;
      } else {
        // Portrait: Contain-fit vertically centred so car is never cropped
        if (canvasRatio > imgRatio) {
          dh = ch;
          dw = ch * imgRatio;
        } else {
          dw = cw;
          dh = cw / imgRatio;
        }
        dx = (cw - dw) / 2;
        dy = (ch - dh) / 2;
      }

      this.ctx.drawImage(img, dx, dy, dw, dh);
    }

    redraw(frameIndex) {
      const clamped = clamp(frameIndex, 0, this.frameCount - 1);
      const img = this.getNearestLoadedFrame(clamped);
      if (img) {
        this.drawFrame(img);
        this.lastRenderedFrame = clamped;
      }
      if (this.onRedraw) {
        this.onRedraw(clamped, this.scrollProgress);
      }
    }

    updateScroll(scrollY) {
      const rect = this.wrapper.getBoundingClientRect();
      const scrollDist = this.wrapper.offsetHeight - window.innerHeight;
      if (scrollDist <= 0) return;

      this.scrollProgress = clamp(-rect.top / scrollDist, 0, 1);
      this.targetFrame = Math.round(this.scrollProgress * (this.frameCount - 1));

      if (this.onProgressUpdate) {
        this.onProgressUpdate(this.scrollProgress, this.targetFrame);
      }
    }

    updateLerp() {
      // In reduced motion, skip smoothing
      if (prefersReducedMotion) {
        const rounded = this.targetFrame;
        if (rounded !== this.lastRenderedFrame) {
          this.redraw(rounded);
        }
        return;
      }

      this.currentFrameFloat += (this.targetFrame - this.currentFrameFloat) * this.lerpSpeed;
      const rounded = Math.round(this.currentFrameFloat);
      if (rounded !== this.lastRenderedFrame) {
        this.redraw(rounded);
      }
    }
  }

  /* ==========================================================================
     5. SECTION 1: HERO SCROLLYTELLING LOGIC
     ========================================================================== */
  let heroScroller = null;
  const heroProgressFill = document.getElementById('hero-progress-fill');
  const heroBlackout = document.getElementById('hero-blackout');
  const hudChapterText = document.getElementById('hud-chapter-text');
  const hudSpeed = document.getElementById('hud-speed');
  const hudDistance = document.getElementById('hud-distance');

  const heroChapters = [
    { el: document.getElementById('hero-ch1'), start: 0.00, end: 0.14, hud: '01/04' },
    { el: document.getElementById('hero-ch2'), start: 0.22, end: 0.42, hud: '02/04' },
    { el: document.getElementById('hero-ch3'), start: 0.50, end: 0.70, hud: '03/04' },
    { el: document.getElementById('hero-ch4'), start: 0.80, end: 1.00, hud: '04/04' }
  ];

  function initHeroScroller() {
    const heroCfg = CONFIG.hero || {};
    heroScroller = new CanvasScroller({
      canvasId: 'hero-canvas',
      wrapperId: 'hero-wrapper',
      frameCount: heroCfg.frameCount || 600,
      desktopPath: heroCfg.desktopPath,
      mobilePath: heroCfg.mobilePath,
      lerpSpeed: heroCfg.lerpSpeed || 0.15,
      onProgressUpdate: (progress) => {
        // Update 1px bottom progress bar
        if (heroProgressFill) {
          heroProgressFill.style.width = `${progress * 100}%`;
        }

        // Fade canvas to solid black over the last 5% (0.95 -> 1.00)
        if (heroBlackout) {
          if (progress >= 0.95) {
            const blackoutAlpha = clamp((progress - 0.95) / 0.05, 0, 1);
            heroBlackout.style.opacity = String(blackoutAlpha);
          } else {
            heroBlackout.style.opacity = '0';
          }
        }

        // Update HUD Telemetry
        const maxSpeed = heroCfg.hud?.maxSpeed || 118;
        const maxDistance = heroCfg.hud?.maxDistance || 4.2;
        const currentSpeed = Math.round(progress * maxSpeed);
        const currentDistance = (progress * maxDistance).toFixed(1);

        if (hudSpeed) {
          hudSpeed.textContent = String(currentSpeed).padStart(3, '0');
        }
        if (hudDistance) {
          hudDistance.textContent = currentDistance;
        }

        // Update Hero Chapters & HUD Chapter indicator
        heroChapters.forEach((ch) => {
          if (!ch.el) return;
          const isActive = progress >= ch.start && progress <= ch.end;
          if (isActive) {
            if (!ch.el.classList.contains('active')) {
              ch.el.classList.add('active');
              // Trigger line masks reveal
              ch.el.querySelectorAll('.line-mask').forEach((mask, idx) => {
                setTimeout(() => mask.classList.add('revealed'), idx * 80);
              });
            }
            if (hudChapterText) {
              hudChapterText.textContent = ch.hud;
            }
          } else {
            if (ch.el.classList.contains('active')) {
              ch.el.classList.remove('active');
              ch.el.querySelectorAll('.line-mask').forEach(mask => mask.classList.remove('revealed'));
            }
          }
        });
      }
    });

    // Initial state: reveal chapter 1 masks
    const ch1 = document.getElementById('hero-ch1');
    if (ch1) {
      ch1.classList.add('active');
      ch1.querySelectorAll('.line-mask').forEach(mask => mask.classList.add('revealed'));
    }
  }

  /* ==========================================================================
     6. SECTION 2: STATEMENT (Word-By-Word Reveal)
     ========================================================================== */
  function initStatementReveal() {
    const section = document.getElementById('statement');
    const textEl = document.getElementById('statement-text');
    if (!section || !textEl) return;

    const sentence = CONFIG.statement?.sentence || "Every part was designed to disappear into one line of light.";
    const words = sentence.split(' ');

    // Render words wrapped in span tags
    textEl.innerHTML = words.map((w, i) => `<span class="statement-word" data-word-idx="${i}">${w}</span>`).join(' ');
    const wordSpans = textEl.querySelectorAll('.statement-word');

    function updateStatementScroll() {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // Active window: section enters center of viewport
      const start = vh * 0.85;
      const end = -vh * 0.15;
      const progress = clamp((start - rect.top) / (start - end), 0, 1);

      const litCount = Math.round(progress * wordSpans.length);
      wordSpans.forEach((span, i) => {
        if (i < litCount) {
          span.classList.add('lit');
        } else {
          span.classList.remove('lit');
        }
      });
    }

    window.addEventListener('scroll', updateStatementScroll, { passive: true });
    updateStatementScroll();
  }

  /* ==========================================================================
     7. SECTION 3: DISMANTLE SCROLLYTELLING LOGIC
     ========================================================================== */
  let dismantleScroller = null;
  const dismantleProgressFill = document.getElementById('dismantle-progress-fill');
  const dismantleCallouts = [
    { id: 'body', el: document.getElementById('callout-body'), trigger: 0.72 },
    { id: 'battery', el: document.getElementById('callout-battery'), trigger: 0.79 },
    { id: 'drive', el: document.getElementById('callout-drive'), trigger: 0.86 },
    { id: 'light', el: document.getElementById('callout-light'), trigger: 0.93 }
  ];

  function positionCallouts() {
    const calloutCfgs = CONFIG.dismantle?.callouts || [];
    calloutCfgs.forEach((cfg) => {
      const calloutEl = document.getElementById(`callout-${cfg.id}`);
      if (!calloutEl) return;

      const dot = calloutEl.querySelector('.callout-dot');
      const card = calloutEl.querySelector('.callout-card');
      const line = calloutEl.querySelector('.callout-line');
      const svg = calloutEl.querySelector('.callout-line-svg');

      if (dot) {
        dot.style.left = `${cfg.dotX}%`;
        dot.style.top = `${cfg.dotY}%`;
      }
      if (card) {
        card.style.left = `${cfg.labelX}%`;
        card.style.top = `${cfg.labelY}%`;
      }
      if (line && svg) {
        // Set coordinates in SVG
        line.setAttribute('x1', `${cfg.dotX}%`);
        line.setAttribute('y1', `${cfg.dotY}%`);
        line.setAttribute('x2', `${cfg.labelX}%`);
        line.setAttribute('y2', `${cfg.labelY}%`);
      }
    });
  }

  function initDismantleScroller() {
    const disCfg = CONFIG.dismantle || {};
    positionCallouts();
    window.addEventListener('resize', positionCallouts, { passive: true });

    dismantleScroller = new CanvasScroller({
      canvasId: 'dismantle-canvas',
      wrapperId: 'dismantle-wrapper',
      frameCount: disCfg.frameCount || 200,
      desktopPath: disCfg.desktopPath,
      mobilePath: disCfg.mobilePath,
      lerpSpeed: disCfg.lerpSpeed || 0.15,
      onProgressUpdate: (progress) => {
        // Update 1px bottom progress bar
        if (dismantleProgressFill) {
          dismantleProgressFill.style.width = `${progress * 100}%`;
        }

        // Callouts fade in one by one after 70% progress
        dismantleCallouts.forEach((item) => {
          if (!item.el) return;
          if (progress >= item.trigger) {
            item.el.classList.add('active');
          } else {
            item.el.classList.remove('active');
          }
        });
      }
    });
  }

  /* ==========================================================================
     8. SECTION 4: LINEUP ACCORDION LOGIC
     ========================================================================== */
  function initLineupAccordion() {
    const accordion = document.getElementById('lineup-accordion');
    if (!accordion) return;

    const slides = Array.from(accordion.querySelectorAll('.lineup-slide'));
    let activeIndex = 0; // GT-E (01) is open by default
    let hoverTimeout = null;

    function openSlide(index) {
      if (index === activeIndex) return;
      activeIndex = index;

      slides.forEach((slide, idx) => {
        const isOpen = idx === activeIndex;
        slide.classList.toggle('open', isOpen);
        slide.setAttribute('aria-expanded', String(isOpen));

        // Update data-cursor state: open slide reads CONFIGURE, closed reads OPEN
        slide.setAttribute('data-cursor', isOpen ? 'CONFIGURE' : 'OPEN');
      });
    }

    // Set initial cursor attributes
    slides.forEach((slide, idx) => {
      slide.setAttribute('data-cursor', idx === 0 ? 'CONFIGURE' : 'OPEN');
    });

    // Hover with 80ms debounce on desktop
    slides.forEach((slide, idx) => {
      slide.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          openSlide(idx);
        }, 80);
      });

      slide.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimeout);
      });

      // Tap / Click for touch and keyboard
      slide.addEventListener('click', () => {
        clearTimeout(hoverTimeout);
        openSlide(idx);
      });

      // Keyboard navigation with Arrow keys
      slide.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = (activeIndex + 1) % slides.length;
          openSlide(next);
          slides[next].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = (activeIndex - 1 + slides.length) % slides.length;
          openSlide(prev);
          slides[prev].focus();
        }
      });
    });

    // Color Swatch interactions
    document.querySelectorAll('.color-swatches').forEach((swatchGroup) => {
      const swatches = swatchGroup.querySelectorAll('.swatch');
      swatches.forEach((swatch) => {
        swatch.addEventListener('click', (e) => {
          e.stopPropagation();
          swatches.forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
        });
      });
    });

    // Animate slides in when section scrolls into view
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          accordion.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    observer.observe(accordion);
  }

  /* ==========================================================================
     9. MASTER REQUEST ANIMATION FRAME LOOP
     ========================================================================== */
  function startMasterLoop() {
    function tick() {
      const scrollY = window.scrollY;

      if (heroScroller) {
        heroScroller.updateScroll(scrollY);
        heroScroller.updateLerp();
      }

      if (dismantleScroller) {
        dismantleScroller.updateScroll(scrollY);
        dismantleScroller.updateLerp();
      }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ==========================================================================
     10. ASYNC PRELOADER & REVEAL PIPELINE
     ========================================================================== */
  async function runPreloaderPipeline() {
    const preloader = document.getElementById('preloader');
    const preloaderLine = document.getElementById('preloader-line');
    const preloaderCounter = document.getElementById('preloader-counter');

    const heroCfg = CONFIG.hero || {};
    const dismantleCfg = CONFIG.dismantle || {};
    const initialLoadCount = heroCfg.preloadInitialCount || 40;

    let loadedCount = 0;

    function updatePreloaderProgress(percent) {
      if (preloaderLine) {
        preloaderLine.style.width = `${percent}%`;
      }
      if (preloaderCounter) {
        preloaderCounter.textContent = String(Math.round(percent)).padStart(3, '0');
      }
    }

    // Phase 1: Load Hero frames 1 to 40
    const initialPromises = [];
    for (let i = 1; i <= initialLoadCount; i++) {
      const p = heroScroller.preloadFrame(i).then(() => {
        loadedCount++;
        const pct = (loadedCount / initialLoadCount) * 100;
        updatePreloaderProgress(pct);
      });
      initialPromises.push(p);
    }

    await Promise.all(initialPromises);

    // Initial first frame draw
    heroScroller.redraw(0);

    // Preloader exit sequence: flash line brighter, fade out preloader
    if (preloader) {
      preloader.classList.add('exiting');
      await new Promise(r => setTimeout(r, 150));
      preloader.classList.add('hidden');
      document.body.classList.remove('loading');
      setTimeout(() => {
        preloader.remove();
      }, 700);
    }

    // Phase 2: Background preloading of remaining hero frames (41 to 600)
    (async function preloadRemainingHero() {
      const totalHero = heroCfg.frameCount || 600;
      for (let i = initialLoadCount + 1; i <= totalHero; i++) {
        await heroScroller.preloadFrame(i);
        // Small yield every 10 frames to avoid micro-stutter
        if (i % 10 === 0) {
          await new Promise(r => setTimeout(r, 16));
        }
      }

      // Phase 3: Background preloading of dismantle frames (1 to 200)
      const totalDismantle = dismantleCfg.frameCount || 200;
      for (let j = 1; j <= totalDismantle; j++) {
        await dismantleScroller.preloadFrame(j);
        if (j % 10 === 0) {
          await new Promise(r => setTimeout(r, 16));
        }
      }
    })();
  }

  /* ==========================================================================
     11. REDUCED MOTION STATIC FALLBACKS
     ========================================================================== */
  function initReducedMotionFallback() {
    if (!prefersReducedMotion) return;

    // Load static keyframes: Hero at 0%, 35%, 65%, 100%
    const heroCfg = CONFIG.hero || {};
    const keyframeIndices = [1, Math.round(heroCfg.frameCount * 0.35), Math.round(heroCfg.frameCount * 0.65), heroCfg.frameCount];
    keyframeIndices.forEach(idx => heroScroller.preloadFrame(idx));

    // Dismantle first and last frames
    const disCfg = CONFIG.dismantle || {};
    dismantleScroller.preloadFrame(1);
    dismantleScroller.preloadFrame(disCfg.frameCount || 200);

    // Draw initial frames
    setTimeout(() => {
      heroScroller.redraw(0);
      dismantleScroller.redraw(0);
    }, 100);
  }

  /* ==========================================================================
     12. INITIALIZATION ENTRY POINT
     ========================================================================== */
  function init() {
    initFilmGrain();
    initCustomCursor();
    initNav();
    initHeroScroller();
    initStatementReveal();
    initDismantleScroller();
    initLineupAccordion();
    startMasterLoop();

    if (prefersReducedMotion) {
      initReducedMotionFallback();
      // Remove loading immediately in reduced motion
      const preloader = document.getElementById('preloader');
      if (preloader) preloader.remove();
      document.body.classList.remove('loading');
    } else {
      runPreloaderPipeline();
    }
  }

  // Run on DOMContentLoaded or immediate if already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

