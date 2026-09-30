/**
 * 발송일 기본값: 행사일(event date)이 속한 주(월~일)의 화요일.
 * dateStr, 반환값 모두 "YYYY-MM-DD" 형식.
 */
export function defaultShipDate(eventDateStr: string): string {
  const d = new Date(`${eventDateStr}T00:00:00`);
  const day = d.getDay(); // 0=Sun .. 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);
  return toDateString(tuesday);
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
