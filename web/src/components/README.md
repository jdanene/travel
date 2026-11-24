# components: shared pieces of the page

The pieces every feature draws with: the sheet, the avatar row, the notice, the flyer head and the mocks' icons. Each one draws; none reads or writes the database.

- Belongs here: a piece two or more features use.
- Does not belong here: a piece one feature uses. Keep it in that feature.
- May import: `lib/`, `types/`. May be imported by `features/` and `app/`.
