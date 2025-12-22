export function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + '-' + 
    String(d.getMonth() + 1).padStart(2, '0') + '-' + 
    String(d.getDate()).padStart(2, '0');
}

export function isOverdue(targetDate: string, status: string): boolean {
  if (status !== 'open') return false;
  return targetDate < todayISO();
}

export function isDueToday(targetDate: string, status: string): boolean {
  if (status !== 'open') return false;
  return targetDate === todayISO();
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
