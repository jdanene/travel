# features: one folder per context

`crew`, `dates`, `stay`, `parties` and `map`. Each owns one branch of the trip's data (plan section 3). Inside a feature: `lib/` for its pure rules, `api/` for its reads and writes, `components/` for its screens.

- Belongs here: what only one context knows.
- Does not belong here: what two features need. Move it to `components/`, `lib/` or `types/`.
- May import: `components/`, `lib/`, `types/`. A feature never imports another feature. Only `app/` imports a feature.
