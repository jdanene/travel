import { warmEmojiPanel } from "../features/activity/lib/warm";

/**
 * The splash's third entry (vite.config.ts builds it beside the app and
 * names it in /app/preload.json as "emoji"). public/assets/hype.js imports
 * it while the splash plays, after the app's files and the emoji file, so
 * the Feed's emoji panel opens drawn on the first tap (owner, 25 Nov 2026:
 * "everything should be loaded at the splash"). It shares its code with
 * the app, so the trip page runs the same warm-up and finds it done.
 *
 * Inputs: none. Output: nothing; the pictures in the browser's cache, 7TV's
 * row and the search index on the device. Any failure is silent.
 * Examples (checked on the emulator): a fresh profile on the splash → the
 * first-screen pictures, 7TV's row and its pictures, then the rest of the grid's pictures
 */
void warmEmojiPanel();
