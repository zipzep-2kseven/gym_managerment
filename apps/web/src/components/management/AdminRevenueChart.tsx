import { useState } from 'react';
import type { AdminDashboardSummary } from '../../services/admin-dashboard.service';
export const formatRevenue = (amount: string) => new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 2,
}).format(Number(amount));

export const AdminRevenueChart = ({ days }: { days: AdminDashboardSummary['daily_revenue'] }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const maximum = Math.max(...days.map(day => Number(day.amount)), 1);
  const points = days.map((day, index) => ({ x: 70 + index * 100, y: 235 - Number(day.amount) / maximum * 180 }));
  const current = selected === null ? null : days[selected];
  const tooltipDay = hovered === null ? null : days[hovered];
  return <section className="admin-revenue-panel" aria-labelledby="revenue-title">
    <div className="admin-revenue-heading"><div><h2 id="revenue-title">Doanh thu 7 ngày gần nhất</h2>
      <p>Theo ngày thanh toán · Giờ Việt Nam · Loại giao dịch đã hoàn tiền</p></div>
      <span>Đơn vị: VNĐ</span></div>
    <div className="admin-revenue-plot">
      {tooltipDay && <div className="admin-revenue-tooltip" role="tooltip">
        <time dateTime={tooltipDay.date}>{tooltipDay.date.slice(8)}/{tooltipDay.date.slice(5, 7)}/{tooltipDay.date.slice(0, 4)}</time>
        <strong>{formatRevenue(tooltipDay.amount)}</strong>
      </div>}
      <svg viewBox="0 0 720 280" role="group" aria-labelledby="revenue-chart-title revenue-chart-description"
        onMouseLeave={() => setHovered(null)}>
        <title id="revenue-chart-title">Biểu đồ doanh thu theo ngày</title>
        <desc id="revenue-chart-description">Doanh thu thanh toán thành công trong 7 ngày, bao gồm hôm nay. Số liệu chi tiết nằm bên dưới.</desc>
        {[0, 0.5, 1].map(ratio => <g key={ratio}>
          <line x1="70" x2="670" y1={235 - ratio * 180} y2={235 - ratio * 180} className="revenue-grid" />
          <text x="60" y={240 - ratio * 180} textAnchor="end" className="revenue-axis">{new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(maximum * ratio)}</text>
        </g>)}
        <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} className="revenue-line" />
        {points.map((point, index) => <g key={days[index].date} role="button" tabIndex={0}
          aria-label={`${days[index].date}: ${formatRevenue(days[index].amount)}`}
          onMouseEnter={() => { setSelected(index); setHovered(index); }}
          onFocus={() => { setSelected(index); setHovered(index); }} onBlur={() => setHovered(null)}
          onClick={() => { setSelected(index); setHovered(index); }}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(index); } }}>
          <circle cx={point.x} cy={point.y} r="24" fill="transparent" />
          <circle cx={point.x} cy={point.y} r={selected === index ? 7 : 5} className="revenue-point"><title>{days[index].date}: {formatRevenue(days[index].amount)}</title></circle>
          <text x={point.x} y="265" textAnchor="middle" className="revenue-axis">{days[index].date.slice(8)}/{days[index].date.slice(5, 7)}</text>
        </g>)}
      </svg>
    </div>
    <details className="admin-revenue-data"><summary>Xem số liệu theo ngày</summary>
      <table><caption className="sr-only">Doanh thu từng ngày</caption><thead><tr><th scope="col">Ngày</th><th scope="col">Doanh thu</th></tr></thead>
        <tbody>{days.map(day => <tr key={day.date}><th scope="row"><time dateTime={day.date}>{day.date.slice(8)}/{day.date.slice(5, 7)}/{day.date.slice(0, 4)}</time></th><td>{formatRevenue(day.amount)}</td></tr>)}</tbody>
      </table>
    </details>
    <p className="admin-revenue-selection" aria-live="polite">{current ? `${current.date}: ${formatRevenue(current.amount)}` : 'Chọn một ngày để xem doanh thu chi tiết.'}</p>
    {days.every(day => Number(day.amount) === 0) && <p>Chưa có thanh toán thành công trong 7 ngày này.</p>}
  </section>;
};
