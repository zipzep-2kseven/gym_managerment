import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ApiClientError } from '../../services/api-client';
import type { Pagination, Status } from '../../types/gym.types';

export const QueryState = ({ pending, error, retry, redirectOnUnauthorized = true }: { pending: boolean; error: Error | null; retry: () => unknown; redirectOnUnauthorized?: boolean }) => {
  if (pending) return <div className="gym-skeleton" role="status" aria-label="Đang tải dữ liệu"><span /><span /><span /></div>;
  if (!error) return null;
  if (error instanceof ApiClientError && error.code === 'PASSWORD_CHANGE_REQUIRED') return <Navigate to="/change-password" replace />;
  if (redirectOnUnauthorized && error instanceof ApiClientError && error.statusCode === 401) return <Navigate to="/login" replace />;
  return <div role="alert" className="alert-banner alert-error"><p>{error instanceof ApiClientError && [403, 404].includes(error.statusCode) ? 'Không có quyền truy cập hoặc tài nguyên không còn khả dụng.' : error.message}</p><button className="btn-secondary" onClick={() => retry()}>Thử lại</button></div>;
};
export const MutationError = ({ error }: { error: Error | null }) => {
  if (!error) return null;
  const details: unknown = error instanceof ApiClientError ? error.details : undefined;
  return <div role="alert" className="alert-banner alert-error"><p>{error.message}</p>
    {Array.isArray(details) && details.map((item, index) => <p key={index}>{item.field}: {item.message}</p>)}
    {!!details && !Array.isArray(details) && typeof details === 'object' && <ul>{Object.entries(details).map(([key, count]) => <li key={key}>{({ payments: 'Thanh toán', memberships: 'Thẻ hội viên', registrations: 'Đăng ký PT', appointments: 'Lịch hẹn' } as Record<string, string>)[key] ?? key}: {String(count)}</li>)}</ul>}
  </div>;
};
export const Pager = ({ pagination: p, onPage }: { pagination: Pagination; onPage: (page: number) => void }) => <nav className="gym-actions" aria-label="Phân trang">
  <button className="btn-secondary" disabled={!p.hasPreviousPage} onClick={() => onPage(p.page - 1)}>Trang trước</button>
  <span>Trang {p.page} / {p.totalPages || 1} · {p.totalItems} kết quả</span>
  <button className="btn-secondary" disabled={!p.hasNextPage} onClick={() => onPage(p.page + 1)}>Trang sau</button>
</nav>;
export const StatusBadge = ({ status }: { status: Status }) => <span className={`badge badge-role ${status === 'ACTIVE' ? 'is-active' : 'is-inactive'}`}>{status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động'}</span>;
export const SafeImage = ({ url, alt }: { url: string | null; alt: string }) => {
  const [failed, setFailed] = useState(false);
  if (!url || failed || !/^https?:\/\//i.test(url)) return <div className="gym-image-fallback" aria-label={alt}>{alt.slice(0, 1).toUpperCase()}</div>;
  return <img className="gym-image" src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
};
export const UnavailableFeature = ({ title }: { title: string }) => <section className="gym-panel"><h1>{title}</h1><p>Chức năng này chưa được triển khai. Vui lòng liên hệ phòng Gym để được hỗ trợ.</p><Link to="/gyms">Quay lại danh sách Gym</Link></section>;
export const ConfirmAction = ({ label, pending, onConfirm }: { label: string; pending: boolean; onConfirm: () => void }) => {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return <button className="btn-secondary" disabled={pending} onClick={() => setConfirm(true)}>{label}</button>;
  return <span className="gym-actions"><span>Xác nhận {label.toLowerCase()}?</span><button className="btn-secondary" disabled={pending} onClick={() => { onConfirm(); setConfirm(false); }}>Xác nhận</button><button className="btn-secondary" disabled={pending} onClick={() => setConfirm(false)}>Hủy</button></span>;
};
