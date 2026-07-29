/* =========================================================
   BOYFIE SITE — main.js
   ========================================================= */

/* ---------- Correct answers ---------- */
const ANSWERS = { q1: 'eyes', q2: 'all' };

/* accepted normalized forms for "17 Oct" */
const DATE_ANSWERS = [
  '17oct', '17october', 'oct17', 'october17',
  '17/10', '10/17', '17-10', '10-17', '1710', '1017'
];

function normalizeDate(str) {
  return str.trim().toLowerCase().replace(/[\s.,]/g, '');
}

function isDateCorrect(str) {
  return DATE_ANSWERS.includes(normalizeDate(str));
}

/* ---------- State ---------- */
const SCREEN_ORDER = ['q1', 'q2', 'q3'];
let currentIndex = 0;
let lockedForReveal = false;
let lastMissedScreen = 'q1'; // which question sent us to Try Again

const gate = document.getElementById('gate');
const screens = {};
document.querySelectorAll('#gate .screen').forEach(el => {
  screens[el.dataset.screen] = el;
});

function showScreen(key) {
  Object.values(screens).forEach(el => el.classList.remove('active'));
  screens[key].classList.add('active');
}

function goToScreen(key) {
  showScreen(key);
  const idx = SCREEN_ORDER.indexOf(key);
  if (idx !== -1) currentIndex = idx;
}

function wrongAnswer(key) {
  lastMissedScreen = key;
  showScreen('tryagain');
}

function correctAnswer() {
  currentIndex++;
  if (currentIndex < SCREEN_ORDER.length) {
    showScreen(SCREEN_ORDER[currentIndex]);
  } else {
    unlockReveal();
  }
}

/* ---------- Wire Q1 & Q2 (option-based) ---------- */
function wireOptionScreen(key) {
  const screenEl = screens[key];
  const options = screenEl.querySelectorAll('.quiz-option');
  const nextBtn = screenEl.querySelector('[data-next]');
  let selected = null;

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selected = opt.dataset.value;
      nextBtn.disabled = false;
    });
  });

  nextBtn.addEventListener('click', () => {
    if (!selected) return;
    if (selected === ANSWERS[key]) {
      correctAnswer();
    } else {
      wrongAnswer(key);
    }
    selected = null;
    options.forEach(o => o.classList.remove('selected'));
    nextBtn.disabled = true;
  });
}

/* ---------- Wire Q3 (text input) ---------- */
function wireQ3() {
  const screenEl = screens.q3;
  const input = screenEl.querySelector('#q3-input');
  const nextBtn = screenEl.querySelector('[data-next]');

  input.addEventListener('input', () => {
    nextBtn.disabled = input.value.trim().length === 0;
  });

  nextBtn.addEventListener('click', () => {
    if (isDateCorrect(input.value)) {
      correctAnswer();
    } else {
      wrongAnswer('q3');
    }
    input.value = '';
    nextBtn.disabled = true;
  });
}
const reveal = document.getElementById("reveal-content");

reveal.classList.add("ready");
/* ---------- Try Again button ---------- */
document.getElementById('btn-tryagain').addEventListener('click', () => {
  goToScreen(lastMissedScreen);
});

/* ---------- Unlock the reveal content ---------- */
function unlockReveal() {
  if (lockedForReveal) return;
  lockedForReveal = true;
document.getElementById("reveal-content").classList.add("ready");
  gate.classList.add('gate-hidden');

  const finishUnlock = () => {
    gate.style.display = 'none';
    document.documentElement.classList.remove('locked');
    if (window.lenis) {
      try { window.lenis.start(); } catch (e) {}
    }
    if (window.gsap && window.ScrollTrigger) {
      try { ScrollTrigger.refresh(); } catch (e) {}
    }
    playBatmanWalk();
  };

  gate.addEventListener('transitionend', finishUnlock, { once: true });
  // fallback in case transitionend never fires (e.g. reduced motion)
  setTimeout(finishUnlock, 900);
}

/* =========================================================
   LENIS SMOOTH SCROLL + GSAP TICKER (optional enhancement —
   the site works with plain scrolling if these fail to load)
   ========================================================= */
function initSmoothScroll() {
  // page starts locked (quiz gate active) — pure CSS/JS, no library needed
  document.documentElement.classList.add('locked');

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('GSAP/ScrollTrigger not available — animations disabled, site still functional.');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  if (typeof Lenis === 'undefined') {
    console.warn('Lenis not available — falling back to native scroll.');
    return;
  }
const screenEl = document.getElementById('deviceScreen');
  const contentEl = document.getElementById('reveal-content');
  const isFramed = screenEl && contentEl && window.matchMedia('(min-width: 900px)').matches;
  try {
 const lenis = isFramed
      ? new Lenis({ wrapper: screenEl, content: contentEl, duration: 1.1, smoothWheel: true })
      : new Lenis({ duration: 1.1, smoothWheel: true });
    window.lenis = lenis;
    lenis.stop();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    
    if (isFramed) {
      ScrollTrigger.defaults({ scroller: screenEl });
    }
  } catch (e) {
    console.warn('Lenis init failed, falling back to native scroll.', e);
  }
}

/* =========================================================
   BATMAN WALK-OFF (reveal hero)
   ========================================================= */
let batmanWalkTimeline = null;
let batmanWalkPlayed = false;

function initBatmanWalk() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const walker = document.getElementById('batmanWalker');
  const hero = document.getElementById('reveal-hero');
  if (!walker || !hero) return;

  const WALK_DURATION = 4.5; // seconds — spec: 4-5s

  // no flip needed — default artwork already faces right, which is
  // correct for a left-to-right walk (previously needed a flip when he
  // walked right-to-left; direction reversed, so the flip is removed)
  gsap.set(walker, { scaleX: 1 });

  const tl = gsap.timeline({ paused: true });

  const stage = document.querySelector('.batman-ground-stage');

  // horizontal travel: left (off-screen) all the way across to a landing
  // spot near the right side of the ground stage — a full-length walk.
  // (Landing "under Spider Lady" doesn't work here: she's positioned on
  // the LEFT of this layout too, same side as his start, so that target
  // was only a few px away — barely any travel at all.)
  // linear/constant speed reads as natural walking pace, not an eased slide.
  tl.to(walker, {
    x: () => {
      const walkerRect = walker.getBoundingClientRect();
      const stageRect = (stage || hero).getBoundingClientRect();
      // right edge of walker lands near the right edge of the stage,
      // with a small margin so he doesn't get clipped by overflow:hidden
      const targetRight = stageRect.left + stageRect.width - 10;
      const targetLeft = targetRight - walkerRect.width;
      return targetLeft - walkerRect.left;
    },
    duration: WALK_DURATION,
    ease: 'none'
  }, 0);

  // leg-movement stand-in: rhythmic up/down bounce timed to the stride
  // (single static sprite — no separate limb frames available to swap)
  tl.to(walker, {
    y: -6,
    duration: 0.18,
    repeat: Math.round(WALK_DURATION / 0.18),
    yoyo: true,
    ease: 'power1.inOut'
  }, 0);

  batmanWalkTimeline = tl;

  // --- Leaving / re-entering this page (scrolling past it and back) ---
  // Watches the section's full scroll range so "leaving" and "returning"
  // correspond to real scroll-crossing events, not the initial page load
  // (that first entrance is fired separately from unlockReveal(), since
  // this section starts at the very top of the document and never gets
  // a genuine "onEnter" crossing on first load).
  ScrollTrigger.create({
    trigger: '.reveal-hero',
    start: 'top top',
    end: 'bottom top',
    onLeave: () => {
      // scrolled past this page, moving on — walk back to start, no fade
      if (batmanWalkPlayed) {
        tl.reverse();
        batmanWalkPlayed = false;
      }
    },
    onEnterBack: () => {
      // scrolled back up into this page — replay the entrance once
      if (!batmanWalkPlayed) {
        batmanWalkPlayed = true;
        tl.play();
      }
    },
  });
}

function playBatmanWalk() {
  if (batmanWalkPlayed || !batmanWalkTimeline) return;
  batmanWalkPlayed = true;
  batmanWalkTimeline.play();
}

/* =========================================================
   SPIDER LADY — dragging the screen down together, rope attached
   ========================================================= */
function initSpiderDrag() {
  const rope = document.getElementById('anchorRope');
  const unit = document.getElementById('dragUnit');
  const section = document.getElementById('paragraph-section');
  if (!rope || !unit || !section) return;

  const DESCEND_DISTANCE = 340; // px the whole unit travels down

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    // fallback: just show everything at its resting position, no scroll-scrub
    rope.style.height = (20 + DESCEND_DISTANCE) + 'px';
    unit.style.transform = `translateY(${DESCEND_DISTANCE}px)`;
    return;
  }

  gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
    }
  })
  // the rope pays out from the fixed anchor as she drags the screen down
  .to(rope, { height: (20 + DESCEND_DISTANCE) + 'px', ease: 'none' }, 0)
  // she + the box + the trail move down together — same amount, same
  // time — because she's physically attached to it, not separate from it
  .to(unit, { y: DESCEND_DISTANCE, ease: 'none' }, 0);
}

/* =========================================================
   TEXT SPLIT REVEALS
   ========================================================= */
function initTextReveals() {
  if (typeof SplitType === 'undefined' || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    return; // headings just show normally, no char-stagger animation
  }
  document.querySelectorAll('[data-split]').forEach(el => {
    const split = new SplitType(el, { types: 'chars' });
    gsap.from(split.chars, {
      opacity: 0,
      y: 16,
      duration: 0.5,
      stagger: 0.02,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      }
    });
  });
}

/* =========================================================
   CUSTOM CURSOR
   ========================================================= */
function initCursor() {
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top = my + 'px';
  });

  function raf() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(raf);
  }
  raf();

  const interactive = 'button, a, input, .quiz-option, img';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactive)) {
      ring.style.width = '52px';
      ring.style.height = '52px';
      ring.style.opacity = '0.7';
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactive)) {
      ring.style.width = '32px';
      ring.style.height = '32px';
      ring.style.opacity = '1';
    }
  });
}

/* =========================================================
   INIT
   ========================================================= */
function safeInit(fn, label) {
  try { fn(); } catch (e) { console.warn(`${label} failed:`, e); }
}

document.addEventListener('DOMContentLoaded', () => {
  safeInit(initSmoothScroll, 'initSmoothScroll');
  safeInit(() => wireOptionScreen('q1'), 'wireOptionScreen q1');
  safeInit(() => wireOptionScreen('q2'), 'wireOptionScreen q2');
  safeInit(wireQ3, 'wireQ3');
  safeInit(initBatmanWalk, 'initBatmanWalk');
  safeInit(initSpiderDrag, 'initSpiderDrag');
  safeInit(initTextReveals, 'initTextReveals');
  safeInit(initCursor, 'initCursor');

  // Allow Enter key to press the active Next button
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const activeNextButton = document.querySelector(".screen.active [data-next]");

      if (activeNextButton && !activeNextButton.disabled) {
        event.preventDefault();
        activeNextButton.click();
      }
    }
  });
});
