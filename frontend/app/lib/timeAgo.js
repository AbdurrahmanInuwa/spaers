// Small relative-time formatter — same vocabulary as the teammate's mobile
// module ("about 8 hours ago", "1 day ago", "25 days ago"). Lightweight on
// purpose; no need for a full i18n lib here.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function timeAgo(iso) {
  if (!iso) return '';
  const t = typeof iso === 'string' ? Date.parse(iso) : Number(iso);
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  if (diff < 30_000) return 'just now';
  if (diff < HOUR) {
    const m = Math.round(diff / MIN);
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  if (diff < DAY) {
    const h = Math.round(diff / HOUR);
    return `about ${h} hour${h === 1 ? '' : 's'} ago`;
  }
  if (diff < WEEK) {
    const d = Math.round(diff / DAY);
    return `${d} day${d === 1 ? '' : 's'} ago`;
  }
  if (diff < MONTH) {
    const w = Math.round(diff / WEEK);
    return `${w} week${w === 1 ? '' : 's'} ago`;
  }
  if (diff < YEAR) {
    const mo = Math.round(diff / MONTH);
    return `${mo} month${mo === 1 ? '' : 's'} ago`;
  }
  const y = Math.round(diff / YEAR);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}
