# app: the shell

The route, the page frame, the home page of design 12, and the modules rule with its state lines and the "All set" line. These join several features, so they live here and nowhere else.

- Belongs here: anything that reads two or more features, and the design tokens (`tokens.css`).
- Does not belong here: a rule of one feature. Put it in that feature's `lib/`.
- May import: `features/`, `components/`, `lib/`, `types/`. Nothing imports `app/`.
