# FOMO NoMo

FOMO no more: a small web app that gathers local events, deduplicates them, and renders a personalized calendar.

Each visitor's sources, source colors, and date range are stored in their browser's `localStorage`. The server is stateless: it fetches and parses supported public event sources when the visitor refreshes their calendar.

## Run it

Requires Node.js 20 or newer.

```sh
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

On Vercel, `vercel.json` routes every request to the single function in `api/index.js` and bundles the `config/` defaults alongside it.
