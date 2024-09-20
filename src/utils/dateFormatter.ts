export function formatDate(date: string | Date | number): string {
  let dateObject: Date;

  if (date instanceof Date) {
    dateObject = date;
  } else if (typeof date === 'number') {
    // Assume it's a Unix timestamp
    // If it's in seconds (10 digits), convert to milliseconds
    dateObject = new Date(date < 10000000000 ? date * 1000 : date);
  } else {
    dateObject = new Date(date);
  }

  return dateObject.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}