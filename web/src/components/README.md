# components: shared pieces of the page

The pieces every feature draws with: the sheet, the avatar row, the notice, the flyer head (and its title alone, `FlyerTitle`), the mocks' icons (and the few the design exceptions add, drawn in their style) and the place search (PlaceSearch: find a place by name for the map, then a new venue). Each one draws; none reads or writes the database.

- Belongs here: a piece two or more features use.
- Does not belong here: a piece one feature uses. Keep it in that feature.
- May import: `lib/`, `types/`. May be imported by `features/` and `app/`.
