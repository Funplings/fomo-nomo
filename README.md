# Open Calendar

A small web app that gathers local events, deduplicates them, and renders a personalized calendar.

Each visitor's sources, source colors, and date range are stored in their browser's `localStorage`. The server is stateless: it fetches and parses supported public event sources when the visitor refreshes their calendar.

## Run it

Requires Node.js 20 or newer.

```sh
npm run ingest
npm start
```

Open `http://localhost:3100`. Edit `config/preferences.json` to tune ranking and `config/sources.json` to add sources.

The config files provide defaults for first-time visitors. After that, visitors manage their own settings from the web app.

Supported source types:

- `json`: an array using the fixture event shape
- `ics`: a public iCalendar URL or local file
- `jsonld`: a venue webpage containing Schema.org Event JSON-LD
- `square`: a public Square classes listing URL
- `partiful`: a public Partiful profile URL
- `eventbrite`: a public Eventbrite organizer URL

Each source accepts either `"url": "https://..."` or `"path": "fixtures/..."`.

For security, the deployed user-facing API accepts public URLs from the supported providers above. This prevents the app from becoming an unrestricted server-side URL fetcher.

## Deploy it

Deploy it to any Node.js host using:

```sh
npm start
```

The server reads the host-provided `PORT` environment variable and does not require a database. User settings remain in each visitor's browser.

## Email delivery

Email uses Resend:

```sh
RESEND_API_KEY=re_... DIGEST_TO=you@example.com npm run send
```

For repeat local sends, put those values in an ignored `.env` file and run `npm run send`.

Set `DIGEST_FROM` after verifying your sending domain. The included GitHub Actions workflow expects `RESEND_API_KEY`, `DIGEST_TO`, and optionally `DIGEST_FROM` as repository secrets.

The workflow ingests at `07:00 UTC` and sends at `12:00 UTC` each day. GitHub cron schedules use UTC, so adjust those values in `.github/workflows/event-digest.yml` for your preferred morning time.
