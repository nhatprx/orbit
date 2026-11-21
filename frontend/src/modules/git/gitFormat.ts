import { formatDateTime } from '../../utils/format';

/** Formats an ISO-8601 GitHub timestamp into a readable date and time string. */
export function formatGitTimestamp(iso: string | null | undefined, fallback = ''): string {
  if (!iso || !iso.trim()) return fallback;
  return formatDateTime(iso);
}
