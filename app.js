const slides = [...document.querySelectorAll(".slide")];
const chapterButtons = [...document.querySelectorAll("[data-go]")];
const navButtons = [...document.querySelectorAll(".chapter-button")];
const previousButton = document.querySelector("#previous-slide");
const nextButton = document.querySelector("#next-slide");
const currentNumber = document.querySelector("#current-number");
const totalNumber = document.querySelector("#total-number");
const chapterName = document.querySelector("#chapter-name");
const statusProgress = document.querySelector("#status-progress");
const announcer = document.querySelector("#slide-announcer");
const motionToggle = document.querySelector("#motion-toggle");
const themeToggle = document.querySelector("#theme-toggle");
const themeLabel = themeToggle.querySelector(".theme-label");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const symbolLayers = [...document.querySelectorAll(".symbol-layer")];
const toolBubbles = [...document.querySelectorAll(".tool-bubble")];
const skillDragMedia = window.matchMedia("(min-width: 701px) and (pointer: fine)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let currentIndex = 0;
let transitionLocked = false;
let wheelLocked = false;
let touchStartX = 0;
let touchStartY = 0;

const numberLabel = (number) => String(number).padStart(2, "0");

function applyTheme(theme, persist = false) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.setAttribute("aria-label", dark ? "Switch to light shade" : "Switch to dark shade");
  themeLabel.textContent = dark ? "Light shade" : "Dark shade";
  themeMeta.content = dark ? "#101522" : "#f7f3ea";
  if (persist) {
    try {
      localStorage.setItem("meghana-theme", dark ? "dark" : "light");
    } catch (_) {
      // The theme still works when storage is unavailable.
    }
  }
}

applyTheme(document.documentElement.dataset.theme || "light");

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme, true);
});

function indexFromHash() {
  const requested = window.location.hash.replace("#", "");
  const index = slides.findIndex((slide) => slide.dataset.hash === requested);
  return index >= 0 ? index : 0;
}

function updateControls() {
  const activeSlide = slides[currentIndex];
  currentNumber.textContent = numberLabel(currentIndex + 1);
  totalNumber.textContent = numberLabel(slides.length);
  chapterName.textContent = activeSlide.dataset.title;
  statusProgress.style.width = `${((currentIndex + 1) / slides.length) * 100}%`;
  previousButton.disabled = currentIndex === 0;
  nextButton.disabled = currentIndex === slides.length - 1;
  announcer.textContent = `Page ${currentIndex + 1} of ${slides.length}: ${activeSlide.dataset.title}`;
  navButtons.forEach((button, index) => {
    const active = index === currentIndex;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function finishTransition(oldSlide) {
  oldSlide.classList.remove("was-active", "reverse-exit");
  oldSlide.setAttribute("aria-hidden", "true");
  transitionLocked = false;
}

function goToSlide(nextIndex, options = {}) {
  const bounded = Math.max(0, Math.min(slides.length - 1, nextIndex));
  if (bounded === currentIndex || transitionLocked) return;

  const forward = bounded > currentIndex;
  const oldSlide = slides[currentIndex];
  const newSlide = slides[bounded];
  transitionLocked = !reducedMotion;

  oldSlide.classList.remove("active");
  oldSlide.classList.add("was-active");
  if (!forward) oldSlide.classList.add("reverse-exit");

  newSlide.classList.remove("was-active", "reverse-exit", "active");
  if (!forward) newSlide.classList.add("reverse-enter");
  newSlide.removeAttribute("aria-hidden");
  newSlide.querySelector(".slide-scroll").scrollTop = 0;
  void newSlide.offsetWidth;
  newSlide.classList.remove("reverse-enter");
  newSlide.classList.add("active");

  currentIndex = bounded;
  updateControls();
  if (options.updateHash !== false) {
    history.replaceState(null, "", `#${newSlide.dataset.hash}`);
  }

  if (reducedMotion) finishTransition(oldSlide);
  else window.setTimeout(() => finishTransition(oldSlide), 760);
}

function canMoveFromWheel(delta) {
  const scroller = slides[currentIndex].querySelector(".slide-scroll");
  const atTop = scroller.scrollTop <= 1;
  const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
  return delta > 0 ? atBottom : atTop;
}

chapterButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    goToSlide(Number(button.dataset.go));
  });
});

previousButton.addEventListener("click", () => goToSlide(currentIndex - 1));
nextButton.addEventListener("click", () => goToSlide(currentIndex + 1));

window.addEventListener("keydown", (event) => {
  const activeTag = document.activeElement?.tagName;
  if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;
  if (["ArrowRight", "ArrowDown", "PageDown"].includes(event.key)) {
    event.preventDefault();
    goToSlide(currentIndex + 1);
  }
  if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
    event.preventDefault();
    goToSlide(currentIndex - 1);
  }
  if (event.key === "Home") {
    event.preventDefault();
    goToSlide(0);
  }
  if (event.key === "End") {
    event.preventDefault();
    goToSlide(slides.length - 1);
  }
});

window.addEventListener(
  "wheel",
  (event) => {
    if (wheelLocked || Math.abs(event.deltaY) < 34 || !canMoveFromWheel(event.deltaY)) return;
    wheelLocked = true;
    goToSlide(currentIndex + (event.deltaY > 0 ? 1 : -1));
    window.setTimeout(() => {
      wheelLocked = false;
    }, 900);
  },
  { passive: true },
);

window.addEventListener(
  "touchstart",
  (event) => {
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
  },
  { passive: true },
);

window.addEventListener(
  "touchend",
  (event) => {
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    const horizontalSwipe = Math.abs(dx) > Math.abs(dy) * 1.25;
    if (!horizontalSwipe || Math.abs(dx) < 65) return;
    goToSlide(currentIndex + (dx < 0 ? 1 : -1));
  },
  { passive: true },
);

window.addEventListener("hashchange", () => {
  goToSlide(indexFromHash(), { updateHash: false });
});

document.querySelectorAll("[data-expand]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(`#${button.dataset.expand}`);
    const open = button.getAttribute("aria-expanded") === "true";

    if (!open) {
      button.closest(".work-stack")?.querySelectorAll("[data-expand]").forEach((otherButton) => {
        if (otherButton === button) return;
        const otherTarget = document.querySelector(`#${otherButton.dataset.expand}`);
        otherButton.setAttribute("aria-expanded", "false");
        otherButton.closest(".role-sheet")?.classList.remove("expanded");
        if (otherTarget) otherTarget.hidden = true;
      });
    }

    button.setAttribute("aria-expanded", String(!open));
    target.hidden = open;
    button.closest(".role-sheet")?.classList.toggle("expanded", !open);
  });
});

motionToggle.addEventListener("click", () => {
  const paused = document.body.classList.toggle("motion-paused");
  motionToggle.setAttribute("aria-pressed", String(paused));
  motionToggle.textContent = paused ? "Play motion" : "Pause motion";
  if (paused) resetSymbolParallax();
});

function resetSymbolParallax() {
  symbolLayers.forEach((layer) => {
    layer.style.setProperty("--parallax-x", "0px");
    layer.style.setProperty("--parallax-y", "0px");
  });
}

let parallaxFrame = 0;
window.addEventListener("pointermove", (event) => {
  if (reducedMotion || document.body.classList.contains("motion-paused")) return;
  window.cancelAnimationFrame(parallaxFrame);
  parallaxFrame = window.requestAnimationFrame(() => {
    const activeLayer = slides[currentIndex].querySelector(".symbol-layer");
    if (!activeLayer) return;
    const depth = Number(activeLayer.dataset.depth || 12);
    const x = (event.clientX / window.innerWidth - 0.5) * depth;
    const y = (event.clientY / window.innerHeight - 0.5) * depth;
    activeLayer.style.setProperty("--parallax-x", `${x.toFixed(2)}px`);
    activeLayer.style.setProperty("--parallax-y", `${y.toFixed(2)}px`);
  });
});

document.documentElement.addEventListener("mouseleave", resetSymbolParallax);

function resetToolBubblePositions() {
  toolBubbles.forEach((bubble) => {
    bubble.classList.remove("dragging");
    bubble.dataset.x = "0";
    bubble.dataset.y = "0";
    bubble.style.removeProperty("translate");
  });
}

if (!skillDragMedia.matches) resetToolBubblePositions();
skillDragMedia.addEventListener?.("change", (event) => {
  if (!event.matches) resetToolBubblePositions();
});

toolBubbles.forEach((bubble) => {
  let originX = 0;
  let originY = 0;
  let baseX = 0;
  let baseY = 0;

  bubble.addEventListener("pointerdown", (event) => {
    if (!skillDragMedia.matches) {
      resetToolBubblePositions();
      return;
    }
    originX = event.clientX;
    originY = event.clientY;
    baseX = Number(bubble.dataset.x || 0);
    baseY = Number(bubble.dataset.y || 0);
    bubble.classList.add("dragging");
    bubble.setPointerCapture(event.pointerId);
  });

  bubble.addEventListener("pointermove", (event) => {
    if (!skillDragMedia.matches) {
      resetToolBubblePositions();
      return;
    }
    if (!bubble.hasPointerCapture(event.pointerId)) return;
    const container = bubble.parentElement.getBoundingClientRect();
    const bounds = bubble.getBoundingClientRect();
    const nextX = baseX + event.clientX - originX;
    const nextY = baseY + event.clientY - originY;
    const limitX = Math.max(0, (container.width - bounds.width) / 2);
    const limitY = Math.max(0, (container.height - bounds.height) / 2);
    const x = Math.max(-limitX, Math.min(limitX, nextX));
    const y = Math.max(-limitY, Math.min(limitY, nextY));
    bubble.dataset.x = String(x);
    bubble.dataset.y = String(y);
    bubble.style.translate = `${x}px ${y}px`;
  });

  const finishDrag = (event) => {
    bubble.classList.remove("dragging");
    if (bubble.hasPointerCapture(event.pointerId)) bubble.releasePointerCapture(event.pointerId);
  };

  bubble.addEventListener("pointerup", finishDrag);
  bubble.addEventListener("pointercancel", finishDrag);
});

currentIndex = indexFromHash();
slides.forEach((slide, index) => {
  const active = index === currentIndex;
  slide.classList.toggle("active", active);
  if (active) slide.removeAttribute("aria-hidden");
  else slide.setAttribute("aria-hidden", "true");
});
updateControls();
