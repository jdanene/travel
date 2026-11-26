/** The mocks' icons (design 12 and 20, the <symbol> list), drawn at one stroke. */
const PATHS = {
  cal: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  bed: <path d="M3 19v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8M3 15h18M7 9V6.5A1.5 1.5 0 0 1 8.5 5h7A1.5 1.5 0 0 1 17 6.5V9" />,
  music: <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  map: <><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z" /><path d="M9 4v14M15 6v14" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  ask: <path d="M9 9.2a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.9v.4M12 18.2v.1" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chev: <path d="M9 5l7 7-7 7" />,
  back: <path d="M15 5l-7 7 7 7" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  spark: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" /></>,
  poll: <path d="M5 20V10M12 20V4M19 20v-7" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  share: <><path d="M12 14.5V4M8 8l4-4 4 4" /><path d="M7 10.5H6v9h12v-9h-1" /></>,
  chat: <path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12z" />,
  // Not in the mocks; drawn in their style for the club sheet (design exception 37).
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.1" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c-2.6 2.4-3.8 5.2-3.8 8.5s1.2 6.1 3.8 8.5c2.6-2.4 3.8-5.2 3.8-8.5S14.6 5.9 12 3.5z" /></>,
  insta: <><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><path d="M16.6 7.4v.1" /></>,
  out: <path d="M9 6h9v9M18 6 6 18" />,
  // Not in the mocks; drawn in their style for Edit in the event sheet (design exception 43).
  edit: <><path d="M5 19h3.5L18.5 9a2.5 2.5 0 0 0-3.5-3.5L5 15.5V19z" /><path d="m13.5 7 3.5 3.5" /></>,
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
