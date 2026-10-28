// Calendar arithmetic uses UTC dates as Vietnam day labels, never browser local dates.
export const vietnamDay = (instant: string | number = Date.now()) => new Date((typeof instant === 'number' ? instant : Date.parse(instant)) + 7 * 3600000).toISOString().slice(0, 10);
export const shiftDay = (day: string, count: number) => new Date(Date.parse(`${day}T00:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
export const weekStart = (day: string) => shiftDay(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
export const intersectsDay = (start: string, end: string, day: string) => {
  const lower = Date.parse(`${day}T00:00:00+07:00`);
  return Date.parse(start) < lower + 86400000 && Date.parse(end) > lower;
};
export const calendarDate = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString('vi-VN', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
export const calendarTime = (instant: string) => new Date(instant).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
export const appointmentStates = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy' };
