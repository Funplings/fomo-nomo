# fomo-nomo

FOMO no more: a small web app that gathers local events, deduplicates them, and renders a personalized calendar.

The browser stores each visitor's sources and source colors in `localStorage`. The server is stateless: it fetches and parses supported public event sources when the visitor refreshes their calendar.

## Run it

Requires Node.js 20 or newer.

```sh
npm start
```

Open `http://localhost:3100`. Edit `config/sources.json` to add default sources.

The config file provides default sources for new visitors. Visitors can add sources and edit source names, URLs, and colors in the web app.

Each refresh collects upcoming events without a date limit. The calendar extends through the latest event that the sources return.

Use **Share**, then **Copy link**, to share a calendar. The URL contains compressed source names, URLs, colors, and enabled states. Source edits update the URL automatically.

A shared link restores its sources and fetches current events. Opening a link leaves saved browser sources intact until you edit the shared calendar. Each link is a snapshot: later edits require a new link.

For other people to open a calendar, share a link from the deployed site. A localhost link works only on the computer that runs the app.

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

The server reads the host-provided `PORT` environment variable and does not require a database. The sources remain in each visitor's browser.

On Vercel, `vercel.json` routes every request to the single function in `api/index.js` and bundles the `config/` defaults alongside it.
