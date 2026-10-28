import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminReportGyms } from '../../hooks/useAdminReportGyms';
import { PageHeader } from '../../components/management/PageHeader';
import { DashboardQueryFeedback } from '../../components/management/DashboardQueryFeedback';
import { Pager, QueryState, StatusBadge } from '../../components/gym/GymUi';

export const AdminReportEntryPage = () => {
  const { list, query, setFilter, accessError } = useAdminReportGyms();
  const [search, setSearch] = useState(query.search || '');
  const [recovered, setRecovered] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { const heading = root.current?.querySelector('h1'); if (heading) { heading.tabIndex = -1; heading.focus(); } }, []);
  useEffect(() => { setSearch(query.search || ''); }, [query.search]);
  useEffect(() => {
    const data = list.data;
    if (!list.isFetching && !list.isError && data && !data.data.length && query.page > Math.max(1, data.pagination.totalPages)) {
      const target = Math.max(1, data.pagination.totalPages); setRecovered(target); setFilter('page', String(target));
    }
  }, [list.data, list.isFetching, list.isError, query.page, setFilter]);
  if (accessError) return <QueryState pending={false} error={accessError} retry={list.refetch} redirectOnUnauthorized={false} />;
  return <div className="admin-report-entry" ref={root}>
    <PageHeader title="Chọn Gym để xem báo cáo sự cố" subtitle="Tìm cơ sở, sau đó mở báo cáo trong phạm vi Gym đã chọn." />
    <form className="gym-toolbar" onSubmit={event => { event.preventDefault(); setRecovered(null); setFilter('search', search.trim()); }}>
      <label className="form-group">Tên hoặc địa chỉ Gym<input className="form-input" name="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <button className="btn-primary" type="submit">Tìm kiếm</button>
      <label className="form-group">Trạng thái Gym<select className="form-input" value={query.status || ''} onChange={event => { setRecovered(null); setFilter('status', event.target.value); }}><option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></label>
    </form>
    <section className="management-card" aria-label="Gym để xem báo cáo" aria-busy={list.isFetching}>
      <button className="btn-secondary" type="button" disabled={list.isFetching} onClick={() => void list.refetch()}>Tải lại danh sách Gym</button>
      <DashboardQueryFeedback query={list} retry={() => void list.refetch()} />
      {recovered !== null && <p role="status">Trang trước không còn dữ liệu; đã chuyển về trang {recovered}.</p>}
      {list.data && <>
        <p role="status">{list.data.pagination.totalItems} Gym phù hợp</p>
        <ul className="admin-report-gym-list">{list.data.data.map(gym => <li key={gym.gym_id}>
          <div><h2>{gym.gym_name}</h2><p>{gym.address}</p><StatusBadge status={gym.status} />{gym.status === 'INACTIVE' && <p>Cơ sở đã ngừng hoạt động; vẫn có thể xem báo cáo lịch sử.</p>}</div>
          {list.isError || list.isFetching ? <span>Đọc lại danh sách trước khi chọn Gym.</span> : <Link className="btn-secondary" to={`/admin/gyms/${gym.gym_id}/reports`}>Xem báo cáo sự cố<span className="sr-only"> tại {gym.gym_name}</span></Link>}
        </li>)}</ul>
        {!list.data.data.length && <p>{list.data.pagination.totalItems === 0 ? 'Không có Gym phù hợp.' : 'Trang này không còn Gym. Đang đọc lại trang phù hợp.'}</p>}
        <fieldset className="gym-fieldset" disabled={list.isFetching}><legend className="sr-only">Chọn trang Gym</legend><Pager pagination={list.data.pagination} onPage={page => { setRecovered(null); setFilter('page', String(page)); }} /></fieldset>
      </>}
    </section>
  </div>;
};
