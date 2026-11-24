/** The mocks' icons (design 12 and 20, the <symbol> list), drawn at one stroke. */
const PATHS = {
  cal: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  bed: <path d="M3 19v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8M3 15h18M7 9V6.5A1.5 1.5 0 0 1 8.5 5h7A1.5 1.5 0 0 1 17 6.5V9" />,
  music: <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  map: <><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z" /><path d="M9 4v14M15 6v14" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chev: <path d="M9 5l7 7-7 7" />,
  /** Not in the mocks: the mark on a date option that holds the Full Moon Party. */
  moon: <path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z" />,
};

export type IconName = keyof typeof PATHS;

/**
 * One of the mocks' line icons. Decorative: the label beside it names the
 * action, so screen readers skip the icon.
 *
 * Inputs: name — one of the mocks' symbols; size — in px, 22 by default.
 * Output: an inline SVG in the current text colour.
 * Examples (checked on screen): <Icon name="cal" /> → the Dates calendar of 12/2
 */
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg className="i" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
