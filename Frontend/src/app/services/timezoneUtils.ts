/**
 * Convert timezone name to short abbreviation
 * Examples: "Asia/Calcutta" -> "IST", "America/New_York" -> "EST/EDT", "UTC" -> "UTC"
 */
export function getTimezoneAbbr(timezone: string): string {
  // Map of common timezone to abbreviation
  const tzAbbreviations: { [key: string]: string } = {
    'UTC': 'UTC',
    'Asia/Calcutta': 'IST',
    'Asia/Kolkata': 'IST',
    'America/New_York': 'ET',
    'America/Chicago': 'CT',
    'America/Denver': 'MT',
    'America/Los_Angeles': 'PT',
    'America/Anchorage': 'AKST/AKDT',
    'Pacific/Honolulu': 'HST',
    'Europe/London': 'GMT/BST',
    'Europe/Paris': 'CET/CEST',
    'Europe/Berlin': 'CET/CEST',
    'Europe/Moscow': 'MSK',
    'Asia/Dubai': 'GST',
    'Asia/Bangkok': 'ICT',
    'Asia/Shanghai': 'CST',
    'Asia/Hong_Kong': 'HKT',
    'Asia/Tokyo': 'JST',
    'Asia/Seoul': 'KST',
    'Australia/Sydney': 'AEDT/AEST',
    'Australia/Melbourne': 'AEDT/AEST',
    'Australia/Perth': 'AWST',
    'Pacific/Auckland': 'NZDT/NZST',
    'Pacific/Fiji': 'FJT',
    'Africa/Cairo': 'EET',
    'Africa/Johannesburg': 'SAST',
    'America/Toronto': 'EST/EDT',
    'America/Mexico_City': 'CST/CDT',
    'America/Buenos_Aires': 'ART',
    'America/Sao_Paulo': 'BRT/BRST',
  }

  // Try exact match first
  if (tzAbbreviations[timezone]) {
    return tzAbbreviations[timezone]
  }

  // If not found, try to extract from timezone name
  // e.g., "Europe/London" -> "London" -> "LON" (take first 3 chars uppercase)
  const parts = timezone.split('/')
  if (parts.length > 1) {
    return parts[parts.length - 1].substring(0, 3).toUpperCase()
  }

  // Fallback to first 3 chars
  return timezone.substring(0, 3).toUpperCase()
}

/**
 * Format UTC timestamp to display in specified timezone
 * Returns formatted string in "MM/DD/YYYY, HH:MM:SS AM/PM" format
 */
export function formatTimestampInTimezone(utcTimestamp: string, timezone: string): string {
  try {
    return new Date(utcTimestamp).toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  } catch {
    return utcTimestamp
  }
}
