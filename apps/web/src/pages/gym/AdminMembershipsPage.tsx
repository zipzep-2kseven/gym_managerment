import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAdminMemberships } from '../../hooks/useAdminMemberships';
import { PageHeader } from '../../components/management/PageHeader';
import { DashboardQueryFeedback } from '../../components/management/DashboardQueryFeedback';
import { Pager, QueryState, StatusBadge } from '../../components/gym/GymUi';
import { AdminMembershipDetails, formatMembershipDate } from '../../components/gym/AdminMembershipDetails';
import type { MembershipStatus } from '../../types/admin-membership.types';

const statusLabel: Record<MembershipStatus, string> = { PENDING: 'Chờ kích hoạt', ACTIVE: 'Hoạt động', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy' };
export const AdminMembershipsPage = () => {
  const { gymId = '' } = useParams();
  const { gym, list, page, validGym, accessError, setPage, actorId } = useAdminMemberships(gymId);
  const [opened, setOpened] = useState<{ id: string; gymId: string; actorId?: string; page: number; updatedAt: number } | null>(null);
  const [recoveredPage, setRecoveredPage] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null), refresh = useRef<HTMLButtonElement>(null);
  const openedId = !list.isFetching && !list.isError && opened?.gymId === gymId && opened.actorId === actorId && opened.page === page && opened.updatedAt === list.dataUpdatedAt ? opened.id : null;
  useEffect(() => { setOpened(null); opener.current = null; }, [gymId, actorId, page]);
  useEffect(() => { setRecoveredPage(null); }, [gymId, actorId]);
  useEffect(() => { setOpened(null); }, [list.isFetching, list.dataUpdatedAt]);
  useEffect(() => {
    const data = list.data;
    if (!list.isFetching && !list.isError && data && !data.data.length && page > Math.max(1, data.pagination.totalPages)) {
      const target = Math.max(1, data.pagination.totalPages);
      setRecoveredPage(target); setPage(target);
    }
  }, [list.data, list.isFetching, list.isError, page, setPage]);
  const close = () => {
    setOpened(null);
    queueMicrotask(() => (opener.current?.isConnected && !opener.current.disabled ? opener.current : refresh.current)?.focus());
  };
  if (!validGym) return <section className="gym-panel" role="alert"><h1>Cơ sở không hợp lệ</h1><Link to="/admin/gyms">Danh sách cơ sở</Link></section>;
  if (accessError) return <QueryState pending={false} error={accessError} redirectOnUnauthorized={false} retry={() => { void gym.refetch(); void list.refetch(); }} />;
  return <div className="admin-memberships">
    <nav className="gym-actions admin-membership-breadcrumb" aria-label="Đường dẫn"><Link to="/admin/gyms">Quản trị Gym</Link><span aria-hidden="true">/</span><Link to={`/admin/gyms/${gymId}`}>{gym.data?.gym_name || 'Cơ sở'}</Link><span aria-hidden="true">/</span><span aria-current="page">Thẻ hội viên</span></nav>
    <PageHeader title="Thẻ hội viên tại Gym" subtitle="Tra cứu thẻ và thời hạn tại cơ sở đang chọn." action={<Link className="btn-secondary" to={`/admin/gyms/${gymId}`}>Thông tin cơ sở</Link>} />
    <QueryState pending={gym.isPending} error={gym.error} redirectOnUnauthorized={false} retry={gym.refetch} />
    {gym.data && !gym.isError && <>
      <section className="admin-scope" aria-label="Cơ sở đang chọn"><h2>{gym.data.gym_name}</h2><StatusBadge status={gym.data.status} /><p>{gym.data.address}</p>
        {gym.data.status === 'INACTIVE' && <p>Cơ sở đang ngừng hoạt động; bạn vẫn có thể tra cứu lịch sử thẻ.</p>}
      </section>
      <section className="management-card" aria-label="Danh sách thẻ hội viên" aria-busy={list.isFetching}>
        <button ref={refresh} type="button" className="btn-secondary" disabled={list.isFetching} onClick={() => { setOpened(null); void gym.refetch(); void list.refetch(); }}>Tải lại danh sách</button>
        <DashboardQueryFeedback query={list} retry={() => { setOpened(null); void list.refetch(); }} />
        <p className="admin-panel-description">Mỗi thẻ được hiển thị riêng, kể cả các thẻ của cùng hội viên. Trạng thái theo dữ liệu đã lưu, không xác nhận điều kiện đăng ký PT.</p>
        {recoveredPage !== null && <p role="status">Trang trước không còn dữ liệu; đã chuyển về trang {recoveredPage}.</p>}
        {list.data && <>
          <p role="status">{list.data.pagination.totalItems} thẻ hội viên</p>
          <ul className="admin-membership-list">{list.data.data.map(row => <li key={row.membership_id}>
            <div className="admin-membership-main"><div><h2>{row.customer.full_name?.trim() || 'Chưa có tên hồ sơ'}</h2><p>User ID: {row.user_id}</p><p>Thẻ: {row.membership_id}</p></div>
              <dl><div><dt>Gói tập</dt><dd>{row.package.package_name}</dd></div><div><dt>Trạng thái thẻ</dt><dd><span className={`admin-membership-status is-${row.status.toLowerCase()}`}>{statusLabel[row.status]}</span></dd></div>
                <div><dt>Ngày bắt đầu</dt><dd><time dateTime={row.start_date}>{formatMembershipDate(row.start_date)}</time></dd></div><div><dt>Ngày kết thúc</dt><dd><time dateTime={row.end_date}>{formatMembershipDate(row.end_date)}</time></dd></div></dl>
            </div>
            <button type="button" className="btn-secondary" aria-expanded={openedId === row.membership_id} aria-controls={`membership-details-${row.membership_id}`} disabled={list.isFetching || list.isError} onClick={event => {
              if (openedId === row.membership_id) close();
              else { opener.current = event.currentTarget; setOpened({ id: row.membership_id, gymId, actorId, page, updatedAt: list.dataUpdatedAt }); }
            }}>Xem thông tin thẻ<span className="sr-only"> {row.membership_id}</span></button>
            {openedId === row.membership_id && <AdminMembershipDetails row={row} onClose={close} />}
          </li>)}</ul>
          {!list.data.data.length && list.data.pagination.totalItems === 0 && <p>Chưa có thẻ hội viên tại cơ sở này.</p>}
          {!list.data.data.length && list.data.pagination.totalItems > 0 && <p>Trang này không còn thẻ. Đang đọc lại trang phù hợp.</p>}
          <fieldset className="gym-fieldset" disabled={list.isFetching}><legend className="sr-only">Chọn trang thẻ hội viên</legend><Pager pagination={list.data.pagination} onPage={next => { setOpened(null); setRecoveredPage(null); setPage(next); }} /></fieldset>
        </>}
      </section>
    </>}
  </div>;
};
