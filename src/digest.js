const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const dayKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0")
].join("-");

const formatTime = (date) => new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
}).format(date);

function eventTile(event) {
  const category = event.categories.find((item) => item !== "community" && item !== "class") || event.categories[0] || "";
  const title = event.url
    ? `<a href="${escapeHtml(event.url)}">${escapeHtml(event.title)}</a>`
    : escapeHtml(event.title);
  return `<div class="event-tile">
    <div class="event-time">${formatTime(new Date(event.start))}${category ? ` · ${escapeHtml(category)}` : ""}</div>
    <div class="event-title">${title}</div>
    <div class="event-meta">${escapeHtml(event.venue)}${event.price ? ` · ${escapeHtml(event.price)}` : ""}</div>
  </div>`;
}

function calendarDays(events, preferences, generatedAt) {
  const start = new Date(generatedAt);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  const finalEvent = events.reduce((latest, event) => {
    const date = new Date(event.start);
    return date > latest ? date : latest;
  }, new Date(generatedAt));
  const rangeEnd = new Date(generatedAt);
  rangeEnd.setDate(rangeEnd.getDate() + (preferences.lookaheadDays || 14));
  const end = finalEvent > rangeEnd ? finalEvent : rangeEnd;
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const grouped = new Map();
  for (const event of [...events].sort((a, b) => new Date(a.start) - new Date(b.start))) {
    const key = dayKey(new Date(event.start));
    grouped.set(key, [...(grouped.get(key) || []), event]);
  }
  const days = [];
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const current = new Date(date);
    days.push({ date: current, events: grouped.get(dayKey(current)) || [] });
  }
  return days;
}

function desktopCalendar(days, generatedAt) {
  const headers = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map((day) => `<th>${day}</th>`).join("");
  const weeks = [];

  for (let index = 0; index < days.length; index += 7) {
    const cells = days.slice(index, index + 7).map(({ date, events }) => {
      const isToday = dayKey(date) === dayKey(generatedAt);
      return `<td class="${isToday ? "today" : ""}">
        <div class="day-number">${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
        ${events.map(eventTile).join("") || '<div class="empty">No events</div>'}
      </td>`;
    }).join("");
    weeks.push(`<tr>${cells}</tr>`);
  }

  return `<table class="calendar" role="presentation"><thead><tr>${headers}</tr></thead><tbody>${weeks.join("")}</tbody></table>`;
}

function mobileAgenda(days, generatedAt) {
  return `<div class="agenda">${days.filter((day) => day.events.length).map(({ date, events }) => {
    const isToday = dayKey(date) === dayKey(generatedAt);
    return `<section class="agenda-day ${isToday ? "today" : ""}">
      <h2>${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h2>
      ${events.map(eventTile).join("")}
    </section>`;
  }).join("")}</div>`;
}

export function renderDigest(events, preferences, generatedAt = new Date()) {
  const days = calendarDays(events, preferences, generatedAt);
  const content = events.length
    ? `${desktopCalendar(days, generatedAt)}${mobileAgenda(days, generatedAt)}`
    : "<p>No upcoming events found. Add a source and run ingestion again.</p>";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>What's Happening?</title><style>
*{box-sizing:border-box}body{margin:0;background:#eee9dc;color:#24271e;font:16px/1.35 Georgia,serif}
main{max-width:1400px;margin:auto;padding:38px 18px 70px}header{border-bottom:2px solid #24271e;margin-bottom:18px;padding-bottom:18px}
.eyebrow,.event-time,.event-meta,.calendar th,.empty{font-family:Arial,sans-serif}
.eyebrow,.calendar th{font-size:11px;letter-spacing:.09em;text-transform:uppercase}
h1{font-size:clamp(38px,6vw,68px);font-weight:400;line-height:.95;margin:10px 0 14px}header p{margin:0}
.calendar{border-collapse:collapse;table-layout:fixed;width:100%;background:#f8f5ec}.calendar th{padding:9px;border:1px solid #aaa28f;background:#24271e;color:#f8f5ec}
.calendar td{height:180px;padding:8px;vertical-align:top;border:1px solid #aaa28f}.calendar td.today,.agenda-day.today{background:#fff4c7}
.day-number{font-size:16px;margin-bottom:7px}.event-tile{background:#e2dbca;border-left:3px solid #68765f;margin:0 0 7px;padding:6px 7px}
.event-time{font-size:9px;letter-spacing:.04em;text-transform:uppercase}.event-title{font-size:14px;line-height:1.15;margin:3px 0}.event-title a{color:inherit;text-decoration-thickness:1px;text-underline-offset:2px}
.event-meta,.empty{font-size:10px;color:#626456}.empty{font-style:italic}.agenda{display:none}
@media(max-width:760px){main{padding:28px 14px 50px}.calendar{display:none}.agenda{display:block}.agenda-day{border-top:1px solid #aaa28f;padding:18px 0}.agenda-day h2{font-size:22px;font-weight:400;margin:0 0 10px}.event-tile{padding:10px}.event-title{font-size:18px}.event-time,.event-meta{font-size:11px}}
</style></head><body><main><header><div class="eyebrow">${generatedAt.toLocaleDateString("en-US", { dateStyle: "full" })}</div>
<h1>What's Happening?</h1><p>${events.length} interesting things happening in the next ${preferences.lookaheadDays} days.</p></header>${content}</main></body></html>`;
}
