# lib: shared code with no screen

The database paths, the Firebase start-up and sign-in, the one trip listener and the splash's snapshot it may start from (snapshot.ts), the one write helper and its one-shot read (for tripSecrets), the Activity line every action adds to its own write (activity.ts), the ID token for the trip texts sender, the place search's call to Photon and its order (placeSearch.ts) with its typing hook (usePlaceHits.ts), the id of a friend's place (ids.ts), and the invite line of the link preview (invite.ts, which scripts/stamp-preview.mjs imports too). No feature calls the Firebase SDK directly; it goes through here.

- Belongs here: code two or more features use that draws nothing.
- Does not belong here: a rule of one feature.
- May import: `types/`. May be imported by `components/`, `features/` and `app/`.
