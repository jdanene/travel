# app: the shell

The route, the page frame, the stage rule, the pinned lines, the "next" rows and the All set summary. These join several features, so they live here and nowhere else.

- Belongs here: anything that reads two or more features, and the design tokens (`tokens.css`).
- Does not belong here: a rule of one feature. Put it in that feature's `lib/`.
- May import: `features/`, `components/`, `lib/`, `types/`. Nothing imports `app/`.
