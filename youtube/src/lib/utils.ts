import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function formatViews(views: number): string {
  if (views >= 100000000) {
    return `${(views / 100000000).toFixed(1)}억회`;
  }
  if (views >= 10000) {
    return `${(views / 10000).toFixed(1)}만회`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}천회`;
  }
  return `${views}회`;
}

export function formatSubscribers(subscribers: number): string {
  if (subscribers >= 100000000) {
    return `${(subscribers / 100000000).toFixed(1)}억명`;
  }
  if (subscribers >= 10000) {
    return `${(subscribers / 10000).toFixed(1)}만명`;
  }
  if (subscribers >= 1000) {
    return `${(subscribers / 1000).toFixed(1)}천명`;
  }
  return `${subscribers}명`;
}

export function formatTimeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ko });
}

export function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}만`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}천`;
  }
  return num.toString();
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
