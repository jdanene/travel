import { useEffect, useState } from "react";
import { activityLine } from "../../../lib/activity";
import { write, type WriteFailure, type WriteResult } from "../../../lib/db";
import { signInWithGoogle, type GoogleFailure } from "../../../lib/firebase";
import * as paths from "../../../lib/paths";
import type { Member, MemberId, Reply, Trip } from "../../../types/trip";

export interface CrewView {
  /** This device's member, or null before the friend replies. */
  memberId: MemberId | null;
  member: Member | null;
  /** Everyone who replied, oldest reply first. */
  members: Array<{ id: MemberId } & Member>;
  expected: Record<MemberId, string>;
  /** The same members, by id, for lookups. */
  byId: Record<MemberId, Member>;
  /** Whether this device holds the organizer mark. */
  isOrganizer: boolean;
  /** Every member's photo, by member id, for the circles (components/Avatars.tsx). */
  photos: Record<MemberId, string | undefined>;
}

/**
 * The crew's read side: who this device is, who replied, who is expected.
 * It reads the trip that useTrip holds; nothing here listens on its own.
 * The write side follows below; every write goes through lib/db.ts.
 *
 * Inputs: trip — the whole trip, or half of it; uid — this device.
 * Output: the crew view. A device pointing at a member that has no record
 * yet (its reply is still on the way) has a memberId and no member.
 * Examples (checked on the emulator):
 *   a new device      → memberId null, member null
 *   after a reply     → memberId "rb", member { name: "RB", reply: "in", … }
 *   JD adds a photo   → photos { jd: "data:image/jpeg;base64,…" }
 */
export function crewOf(trip: Trip, uid: string): CrewView {
  const all = trip.crew?.members ?? {};
  const devices = trip.crew?.devices ?? {};
  const memberId = devices[uid] ?? null;
  return {
    memberId,
    member: memberId ? (all[memberId] ?? null) : null,
    members: Object.entries(all)
      .map(([id, member]) => ({ id, ...member }))
      .sort((a, b) => a.at - b.at),
    expected: trip.crew?.expected ?? {},
    byId: all,
    isOrganizer: trip.crew?.organizers?.[uid] === true,
    photos: Object.fromEntries(Object.entries(all).map(([id, member]) => [id, member.photo])),
  };
}

/** A friend to join as: an id made by idFromName(), and the name to show. */
export interface Person {
  id: MemberId;
  name: string;
}

/**
 * Makes this device a member and saves its reply: first the device points
 * at the member, then the member's record is written, because the rules
 * let a device write only under the member it points to. A second phone
 * that picks a taken name becomes the same member and keeps its earlier
 * answers (cases 4 and 5); the name already saved stays.
 *
 * Inputs: the trip, this device, the friend picked or typed, their record
 * if they replied before, and the reply tapped.
 * Output: the write result; a refusal or failure leaves the page as it was.
 * With no connection both writes wait in order and land when it is back.
 * Examples (checked on the emulator with two browser profiles):
 *   a new name "RB", "I'm in"       → crew/devices/<uid> = "rb"; members/rb = { name: "RB", reply: "in", … }
 *   a second phone picks "RB"       → the same member; RB's answers show on both phones
 */
export async function join(tripId: string, uid: string, person: Person, existing: Member | null, reply: Reply): Promise<WriteResult> {
  const pointed = await write({ [paths.device(tripId, uid)]: person.id });
  if (!pointed.ok) return pointed;
  return saveReply(tripId, person.id, existing?.name ?? person.name, reply, existing);
}

/**
 * Points this device at a member who replied on another device, and
 * nothing else: the member's reply, time and photo stay as they are. It is
 * the join sheet's pick without a new reply (case 4).
 * Inputs: the trip, this device, the member.
 * Output: the write result.
 * Examples (checked on the emulator with two browser profiles):
 *   a second browser taps "Dom" → crew/devices/<uid> = "dom"; the trip opens as Dom, Dom's "I'm in" kept
 */
export function comeBack(tripId: string, uid: string, memberId: MemberId): Promise<WriteResult> {
  return write({ [paths.device(tripId, uid)]: memberId });
}

/**
 * Saves a member's reply; a new reply replaces the old one (case 7). It
 * writes the three fields one by one, so the member's photo stays. The
 * Activity line goes in the same write: "joined" for a first reply,
 * "reply-changed" for a different one, none for the same reply again.
 * Inputs: the trip, the member, the member's name, the reply, and the
 * member's record before this reply (null for a first reply).
 * Output: the write result.
 * Examples (checked on the emulator):
 *   RB taps "Maybe" after "I'm in" → members/rb.reply = "maybe"; RB's photo stays; a "reply-changed" line, text "maybe"
 *   RJ replies for the first time  → members/rj and a "joined" line by rj
 */
export function saveReply(tripId: string, memberId: MemberId, name: string, reply: Reply, previous: Member | null): Promise<WriteResult> {
  const field = (key: "name" | "reply" | "at") => paths.memberField(tripId, memberId, key);
  const line =
    previous === null
      ? activityLine(tripId, { kind: "joined", by: memberId })
      : previous.reply !== reply
        ? activityLine(tripId, { kind: "reply-changed", by: memberId, text: reply })
        : {};
  return write({ [field("name")]: name, [field("reply")]: reply, [field("at")]: Date.now(), ...line });
}

const KEY_STORE = "organizerKey";

/**
 * Takes the organizer key out of the address bar at once, so a shared
 * screenshot or a copied link never carries it, and keeps it for this tab
 * until the claim is made. Storage may be blocked (private mode); the key
 * then lives only in the page.
 *
 * Inputs: none; reads ?organizer= from the address.
 * Output: the key, or null when there is none.
 * Examples (checked on screen):
 *   /trip/abc?organizer=K…  → "K…", and the address bar shows /trip/abc
 */
export function takeOrganizerKey(): string | null {
  const url = new URL(window.location.href);
  const fromAddress = url.searchParams.get("organizer");
  if (fromAddress) {
    url.searchParams.delete("organizer");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    try {
      sessionStorage.setItem(KEY_STORE, fromAddress);
    } catch {
      // Storage is blocked; the key stays in memory for this page only.
    }
    return fromAddress;
  }
  try {
    return sessionStorage.getItem(KEY_STORE);
  } catch {
    return null;
  }
}

/**
 * Makes this device an organizer with the key from the organizer link:
 * the device writes its claim, then its organizer mark; the rules accept
 * both only when the key exists.
 *
 * Inputs: the trip, this device, the key.
 * Output: the write result. "refused" means the key is not this trip's
 * (case 6 of Trip 6): the page says "This organizer link is not valid."
 * Examples (checked on the emulator):
 *   the key from local/links.emulator.txt → { ok: true }; the page shows "Organizer view."
 *   a wrong key                           → { ok: false, reason: "refused" }
 */
export async function claimOrganizer(tripId: string, uid: string, key: string): Promise<WriteResult> {
  const claimed = await write({ [paths.organizerClaim(tripId, uid)]: key });
  if (!claimed.ok) return claimed;
  const marked = await write({ [paths.organizer(tripId, uid)]: true });
  if (marked.ok) {
    try {
      sessionStorage.removeItem(KEY_STORE);
    } catch {
      // Nothing was stored.
    }
  }
  return marked;
}

/**
 * Runs the organizer link once this device is a member: the join sheet
 * comes first, then the claim (Trip 6, case 7).
 *
 * Inputs: the trip, this device, and the crew view.
 * Output: "invalid" when the key was refused, so the page can say "This
 * organizer link is not valid." while the friend carries on as a friend;
 * otherwise null.
 * Examples (checked on the emulator):
 *   the organizer link, after joining  → the device becomes an organizer; null
 *   a link with a wrong key            → "invalid"
 */
export function useOrganizerLink(tripId: string, uid: string, crew: CrewView): "invalid" | null {
  const [key] = useState(takeOrganizerKey);
  const [invalid, setInvalid] = useState(false);
  const ready = key !== null && crew.member !== null && !crew.isOrganizer && !invalid;

  useEffect(() => {
    if (!ready) return;
    void claimOrganizer(tripId, uid, key).then((result) => {
      if (!result.ok && result.reason === "refused") setInvalid(true);
    });
  }, [ready, tripId, uid, key]);

  return invalid ? "invalid" : null;
}

export type OrganizerSignInResult = { ok: true } | { ok: false; reason: GoogleFailure | WriteFailure; code?: string };

/**
 * Makes this device an organizer by its Google account (plan, D15): it
 * signs in with Google, then writes the device's organizer mark. The rules
 * accept the mark only when the account's email is verified and on the
 * trip's admin list (or when the device holds the organizer key, as with
 * the organizer link). A refusal leaves the device signed in as a friend.
 *
 * Inputs: the trip. Call it from a click: it opens the Google window.
 * Output: { ok: true } once the mark is saved; otherwise the reason, and
 * for a sign-in failure the SDK's code. Nothing retries.
 * Examples (checked on the emulator, with a fake Google credential in place of the window):
 *   Owner@Example.com, owner@example.com on the list → { ok: true }
 *   friend@example.com, not on the list             → { ok: false, reason: "refused" }
 */
export async function signInAsOrganizer(tripId: string): Promise<OrganizerSignInResult> {
  const signedIn = await signInWithGoogle();
  if (!signedIn.ok) return signedIn;
  return write({ [paths.organizer(tripId, signedIn.uid)]: true });
}
