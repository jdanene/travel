/**
 * Clears the smoke that covers the app's first paint (index.html,
 * public/assets/smoke.css): it drifts apart over about 700 ms, then leaves
 * the page. A second call, or a call after the 4 s fallback in index.html,
 * does nothing.
 *
 * Inputs: none; reads #smoke from the page.
 * Output: nothing.
 * Examples (checked in Chrome on the emulator):
 *   the trip is read        → the smoke drifts apart and the invitation or home page shows
 *   reduced motion          → the smoke is never drawn; the call removes it at once
 */
export function clearSmoke(): void {
  const smoke = document.getElementById("smoke");
  if (!smoke || smoke.classList.contains("out")) return;
  smoke.classList.add("out");
  window.setTimeout(() => smoke.remove(), 800);
}
