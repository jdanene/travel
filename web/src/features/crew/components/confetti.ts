/** The burst's length in milliseconds. */
const LENGTH = 1500;

/** The pieces' colours: the app's accent, the hype yellow and pink, and the page's ink. */
const COLOURS = ["#ffd23d", "#ff3cac", "#000000", "#ffd23d", "#ff3cac"];

/**
 * One short burst of confetti when a friend's "I'm in" saves. It draws on
 * a canvas laid over the page for about 1.5 s and removes it; the canvas
 * takes no taps, so the page stays usable while it falls. Under
 * prefers-reduced-motion it does nothing.
 *
 * Inputs: none. It starts a little above the middle of the window, where
 * the home page opens after the reply.
 * Output: none; the canvas is gone after the burst.
 * Examples (checked in Chrome at 375 px and 1650 px):
 *   RB taps "I'm in" and it saves → about 90 pieces fly up and fall; gone after 1.5 s
 *   reduced motion                 → nothing moves
 */
export function burst(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:1000";
  document.body.append(canvas);
  context.scale(ratio, ratio);

  const origin = { x: width / 2, y: height * 0.35 };
  const pieces = Array.from({ length: 90 }, (_, k) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = 7 + Math.random() * 9;
    return {
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 5,
      spin: Math.random() * Math.PI,
      turn: (Math.random() - 0.5) * 0.4,
      colour: COLOURS[k % COLOURS.length],
    };
  });

  const start = performance.now();
  let last = start;
  const frame = (now: number) => {
    const elapsed = now - start;
    const step = Math.min((now - last) / 16.7, 3);
    last = now;
    context.clearRect(0, 0, width, height);
    context.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - LENGTH * 0.6) / (LENGTH * 0.4));
    for (const piece of pieces) {
      piece.vy += 0.35 * step;
      piece.vx *= 0.985;
      piece.x += piece.vx * step;
      piece.y += piece.vy * step;
      piece.spin += piece.turn * step;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.spin);
      context.fillStyle = piece.colour;
      context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      context.restore();
    }
    if (elapsed < LENGTH) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
