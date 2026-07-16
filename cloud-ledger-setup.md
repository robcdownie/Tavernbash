# Cloud Ledger setup

Version 0.91 adds optional Supabase backup for finished run reports. The game
stays fully playable without an account or network connection.

## Supabase project

1. Create one Free Plan Supabase project.
2. Open the SQL editor and run
   `supabase/migrations/202607160001_cloud_ledger.sql`.
3. In Authentication URL Configuration, set the site URL to
   `https://platosd.com` and allow `https://platosd.com/**` as a redirect URL.
4. Keep email authentication enabled. The game uses passwordless email links.
5. Copy the project URL and publishable key.

For local development, copy `.env.example` to `.env.local` and fill in the two
public values.

For GitHub Pages, create these repository variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The publishable key is intentionally browser-visible. Database access is
protected by the checked-in Row Level Security policies. Never place the
service-role key in the repository, GitHub Pages, or the game.

## Read-only Codex access

Create a separate confirmed Auth user such as `codex-reader@platosd.com` with a
long generated password. Copy its user UUID, then run:

```sql
insert into private.analytics_users (user_id)
values ('THE-ANALYTICS-USER-UUID')
on conflict (user_id) do nothing;
```

Copy `.env.analytics.example` to `.env.analytics` and fill in the public project
values plus that reader account. The file is gitignored.

The reader cannot update or delete another player's runs. Its SELECT policy
shows only reports whose owner enabled Share balance data in the game.

Examples:

```powershell
npm run reports -- --last 20
npm run reports -- --version 0.91.0 --route quick --last 100
npm run reports -- --hero silkblade --full
```

Personal cloud backup does not imply balance sharing. A player can back up and
restore history while leaving sharing off.
