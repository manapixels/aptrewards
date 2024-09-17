export function truncateAddress(address: string | undefined, startLength: number = 6, endLength: number = 4): string {
  if (!address) return '';
  
  if (address.length <= startLength + endLength) {
    return address;
  }

  const start = address.slice(0, startLength);
  const end = address.slice(-endLength);
  
  return `${start}...${end}`;
}