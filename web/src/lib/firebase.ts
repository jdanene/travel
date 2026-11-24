import { initializeApp, type FirebaseOptions } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  type AuthError,
} from "firebase/auth";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";

/**
 * Starts the Firebase SDK once for the whole page and signs this device in
 * with no account; the organizer may add a Google sign-in later. Only lib/ touches the SDK; features go through useTrip
 * and db.ts.
 *
 * On localhost and 127.0.0.1 the app talks to the emulators (firebase.json
 * holds their ports), so a page served by `firebase emulators:start` never
 * reaches the live database. Anywhere else it reads the web app's settings
 * from the VITE_FIREBASE_* variables in web/.env.production.
 */

const PROJECT_ID = "travel-ca8f9";
const DATABASE_NAME = `${PROJECT_ID}-default-rtdb`;

const onEmulator = ["localhost", "127.0.0.1"].includes(window.location.hostname);

const options: FirebaseOptions = onEmulator
  ? {
      apiKey: "emulator",
      // The Google window needs an auth domain; on the emulator it opens the emulator's own page.
      authDomain: `${PROJECT_ID}.firebaseapp.com`,
      projectId: PROJECT_ID,
      databaseURL: `http://127.0.0.1:9000?ns=${DATABASE_NAME}`,
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      authDomain: `${PROJECT_ID}.firebaseapp.com`,
      projectId: PROJECT_ID,
      databaseURL: `https://${DATABASE_NAME}.firebaseio.com`,
    };

const app = initializeApp(options);

export const auth = getAuth(app);
export const database = getDatabase(app);

if (onEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectDatabaseEmulator(database, "127.0.0.1", 9000);
}

export type SignInResult = { ok: true; uid: string } | { ok: false; reason: string };

/** The waits before each try, from the first: 0 s, 1 s, 3 s (plan, case 3). */
const SIGN_IN_WAITS_MS = [0, 1000, 2000];

/**
 * Signs this device in anonymously, so the rules can tell one phone from
 * another. A device that signed in before keeps its uid: the SDK restores
 * it from storage, and this waits for that, because signing in before the
 * restore ends would make a new device and lose its member.
 *
 * Inputs: none.
 * Output: the device's uid, or, after three failed tries, the reason as the
 * SDK's error code (for example "auth/network-request-failed"). The caller
 * shows the reason with a "Try again" button; nothing here retries again.
 * Examples (checked on the emulator, not in a test):
 *   emulator running  → { ok: true, uid: "…" }
 *   emulator stopped  → { ok: false, reason: "auth/network-request-failed" } after about 3 s
 */
export async function signIn(): Promise<SignInResult> {
  await auth.authStateReady();
  if (auth.currentUser) return { ok: true, uid: auth.currentUser.uid };

  let reason = "unknown";
  for (const wait of SIGN_IN_WAITS_MS) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    try {
      const { user } = await signInAnonymously(auth);
      return { ok: true, uid: user.uid };
    } catch (error) {
      reason = (error as { code?: string }).code ?? String(error);
    }
  }
  return { ok: false, reason };
}

/** Why the Google sign-in did not finish, in the words the page needs. */
export type GoogleFailure = "closed" | "offline" | "disabled" | "other";

export type GoogleSignInResult =
  | { ok: true; uid: string }
  | { ok: false; reason: GoogleFailure; code: string };

/** The SDK codes for a popup the browser blocked or the person closed. */
const POPUP_CODES = ["auth/popup-blocked", "auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/user-cancelled"];

/**
 * Signs the organizer in with Google, so an email on the trip's admin list
 * can make this device an organizer (plan, D15). It links Google to the
 * device's anonymous account, so the uid stays the same and so does the
 * member it points to. When that Google account is already linked to
 * another device's uid (the organizer's second phone), it signs in as that
 * uid instead; the device then picks its name again in the join sheet.
 *
 * It must run from a click, or the browser blocks the popup. It never
 * retries: the caller offers "Try again". The ID token is refreshed before
 * it returns, so the next database write carries the Google email.
 *
 * Inputs: none; uses the device's current sign-in.
 * Output: the uid now signed in, or the reason with the SDK's code.
 * Examples (checked on the emulator, not in a test; the link and sign-in
 * steps with the emulator's fake Google credential in place of the window):
 *   a new Google account                → { ok: true, uid: <the same uid as before> }
 *   the account linked on another phone → { ok: true, uid: <that phone's uid> } */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  // The page shows this link only once sign-in is done, so there is a user.
  // Nothing is awaited before the popup opens: Safari blocks a popup that
  // does not open in the click itself.
  const current = auth.currentUser;
  if (!current) return { ok: false, reason: "other", code: "auth/no-current-user" };
  try {
    const { user } = await linkWithPopup(current, provider);
    await user.getIdToken(true);
    return { ok: true, uid: user.uid };
  } catch (error) {
    const code = (error as AuthError).code ?? String(error);
    if (code === "auth/credential-already-in-use" || code === "auth/provider-already-linked") {
      return signInAgain(error as AuthError);
    }
    return { ok: false, reason: googleFailure(code), code };
  }
}

/** The second phone: Google says the account belongs to another uid, so sign in as it. */
async function signInAgain(error: AuthError): Promise<GoogleSignInResult> {
  // provider-already-linked: this device already signed in with Google; its uid stands.
  if (error.code === "auth/provider-already-linked" && auth.currentUser) return { ok: true, uid: auth.currentUser.uid };
  // Google's answer normally carries the credential; without it there is nothing to sign in with.
  const credential = GoogleAuthProvider.credentialFromError(error);
  if (!credential) return { ok: false, reason: "other", code: error.code };
  try {
    const { user } = await signInWithCredential(auth, credential);
    await user.getIdToken(true);
    return { ok: true, uid: user.uid };
  } catch (again) {
    const code = (again as AuthError).code ?? String(again);
    return { ok: false, reason: googleFailure(code), code };
  }
}

function googleFailure(code: string): GoogleFailure {
  if (POPUP_CODES.includes(code)) return "closed";
  if (code === "auth/network-request-failed") return "offline";
  if (code === "auth/operation-not-allowed" || code === "auth/configuration-not-found") return "disabled";
  return "other";
}

/**
 * Calls back with the uid each time the signed-in account changes, so the
 * page follows a device that signed in as the organizer's Google account.
 *
 * Inputs: onUid — called with the new uid; never with a signed-out state.
 * Output: a function that stops the watch.
 * Examples (checked on the emulator): the second phone signs in with Google → onUid(<the first phone's uid>)
 */
export function watchUid(onUid: (uid: string) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) onUid(user.uid);
  });
}
