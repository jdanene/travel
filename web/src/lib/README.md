# lib: shared code with no screen

The database paths, the Firebase start-up and sign-in, the one trip listener, the one write helper, the place search's call to Photon (placeSearch.ts), and the invite line of the link preview (invite.ts, which scripts/stamp-preview.mjs imports too). No feature calls the Firebase SDK directly; it goes through here.

- Belongs here: code two or more features use that draws nothing.
- Does not belong here: a rule of one feature.
- May import: `types/`. May be imported by `components/`, `features/` and `app/`.
