# features: one folder per context

`crew`, `dates`, `stay`, `parties`, `links`, `map` and `activity` (the Activity list: posts, polls, replies and how each line reads, with the Instagram and TikTok videos in them playing in place, exception 36; the other features write their own lines through `lib/activity.ts`). Each owns one branch of the trip's data (plan section 3). Inside a feature: `lib/` for its pure rules, `api/` for its reads and writes, `components/` for its screens.

- Belongs here: what only one context knows.
- Does not belong here: what two features need. Move it to `components/`, `lib/` or `types/`.
- May import: `components/`, `lib/`, `types/`. A feature never imports another feature. Only `app/` imports a feature.
