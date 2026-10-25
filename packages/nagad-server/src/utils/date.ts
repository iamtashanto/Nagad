/**
 * Formats a Date into Asia/Dhaka (UTC+6) timestamp string: yyyyMMddHHmmss (14 digits).
 * Computed strictly via explicit UTC millisecond math without altering or depending on process.env.TZ.
 */
export function formatBdtDateTime(clock?: () => Date): string {
  const date = clock ? clock() : new Date();

  // Shift to UTC, then add 6 hours for Bangladesh Standard Time (BST)
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const bdtDate = new Date(utcMs + 6 * 3600000);

  const year = bdtDate.getFullYear();
  const month = String(bdtDate.getMonth() + 1).padStart(2, "0");
  const day = String(bdtDate.getDate()).padStart(2, "0");
  const hours = String(bdtDate.getHours()).padStart(2, "0");
  const minutes = String(bdtDate.getMinutes()).padStart(2, "0");
  const seconds = String(bdtDate.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Returns a Date object shifted to Asia/Dhaka (UTC+6).
 */
export function getBdtDate(clock?: () => Date): Date {
  const date = clock ? clock() : new Date();
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcMs + 6 * 3600000);
}
