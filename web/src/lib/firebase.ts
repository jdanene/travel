import { initializeApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously } from "firebase/auth";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";

/**
 * Starts the Firebase SDK once for the whole page and signs this device in
 * with no account. Only lib/ touches the SDK; features go through useTrip
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
