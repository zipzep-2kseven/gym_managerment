import { Link } from 'react-router-dom';

const shortcuts = [
  { id: 'gyms', to: '/admin/gyms', label: 'Quản lý phòng Gym', description: 'Thông tin cơ sở và Manager phụ trách.' },
  { id: 'users', to: '/admin/users', label: 'Quản lý tài khoản', description: 'Tra cứu tài khoản và trạng thái.' },
  { id: 'reviews', to: '/admin/reviews', label: 'Kiểm duyệt đánh giá', description: 'Xem và xử lý nội dung vi phạm.' },
];

export const AdminDashboardShortcuts = () => (
  <section className="management-card admin-dashboard-shortcuts" aria-labelledby="admin-shortcuts-heading">
    <div className="management-card-header">
      <div>
        <h2 className="management-card-title" id="admin-shortcuts-heading">Lối tắt tác vụ</h2>
        <p className="admin-panel-description">Đi thẳng đến các công việc quản trị.</p>
      </div>
    </div>
    <nav className="management-quick-links" aria-label="Tác vụ quản trị">
      {shortcuts.map(shortcut => <Link key={shortcut.id} to={shortcut.to} className="management-quick-link" aria-label={shortcut.label} aria-describedby={`admin-shortcut-${shortcut.id}`}>
        <span className="admin-shortcut-text">
          <span className="admin-shortcut-title">{shortcut.label}</span>
          <span className="admin-shortcut-description" id={`admin-shortcut-${shortcut.id}`}>{shortcut.description}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
      </Link>)}
    </nav>
  </section>
);
