import type { Lang } from '@/i18n/strings';

/** Indian digit grouping (1,50,000) without relying on Intl support in the JS engine. */
function groupIndian(n: number): string {
  const [intPart, frac] = Math.abs(n).toString().split('.');
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const grouped = rest ? `${rest},${last3}` : last3;
  return `${n < 0 ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
}

/** Amounts come from the API in paise. */
export function formatMoney(paise: number, { symbolSpace = true } = {}): string {
  const rupees = paise / 100;
  const value = Number.isInteger(rupees) ? groupIndian(rupees) : groupIndian(Number(rupees.toFixed(2)));
  return `₹${symbolSpace ? ' ' : ''}${value}`;
}

const MONTHS: Record<Lang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
  hi: ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सितं', 'अक्टू', 'नवं', 'दिसं'],
};

const pad = (n: number) => String(n).padStart(2, '0');

/** "10 Aug 26" in the device's local time zone. */
export function formatShortDate(iso: string | Date, lang: Lang): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

/** "11:50 PM" */
export function formatTime(iso: string | Date): string {
  const d = new Date(iso);
  const h = d.getHours();
  return `${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

export const formatDateTime = (iso: string | Date, lang: Lang) => `${formatShortDate(iso, lang)}, ${formatTime(iso)}`;

export interface Duration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function splitDuration(ms: number): Duration {
  const clamped = Math.max(0, ms);
  const s = Math.floor(clamped / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    totalMs: clamped,
  };
}

/** "01d : 06h : 28m : 32s" */
export function formatCountdown(d: Duration): string {
  return `${pad(d.days)}d : ${pad(d.hours)}h : ${pad(d.minutes)}m : ${pad(d.seconds)}s`;
}

/** "09:59" for short holds */
export const formatMinSec = (d: Duration) => `${pad(d.days * 24 * 60 + d.hours * 60 + d.minutes)}:${pad(d.seconds)}`;

const HI_ORDINALS = ['प्रथम', 'द्वितीय', 'तृतीय', 'चतुर्थ', 'पंचम', 'षष्ठ', 'सप्तम', 'अष्टम', 'नवम', 'दशम'];

export function ordinal(n: number, lang: Lang): string {
  if (lang === 'hi') return HI_ORDINALS[n - 1] ?? `${n}वाँ`;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
