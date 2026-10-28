import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAdminPtWorkspace } from '../../hooks/useAdminPtWorkspace';
import { ApiClientError } from '../../services/api-client';
import { PageHeader } from '../../components/management/PageHeader';
import { DashboardQueryFeedback } from '../../components/management/DashboardQueryFeedback';
import { Pager, QueryState, StatusBadge } from '../../components/gym/GymUi';
import { AdminRegistrationEnd } from './AdminRegistrationEnd';
import { AdminRegistrationRow, AdminAppointmentRow } from './AdminPtRows';
import type { Registration } from '../../types/pt.types';

const AdminGymPt = ({ gymId }: { gymId: string }) => {
  const { gym, regs, apts, validGym, accessError, recovered, setRegPage, setAptPage } = useAdminPtWorkspace(gymId);
  const { refreshSession } = useAuth();
  const [selected, setSelected] = useState<Registration | null>(null), [busy, setBusy] = useState(false);
  const [writeAccess, setWriteAccess] = useState<ApiClientError | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null), refresh = useRef<HTMLButtonElement>(null);
  const access = accessError || writeAccess;
  useEffect(() => { if (writeAccess) void refreshSession(); }, [writeAccess, refreshSession]);
  const close = () => { setSelected(null); queueMicrotask(() => (opener.current?.isConnected && !opener.current.disabled ? opener.current : refresh.current)?.focus()); };
  const blocked = busy || !!selected;
  if (!validGym) return <section role="alert"><h1>Cơ sở không hợp lệ</h1><Link to="/admin/gyms">Danh sách cơ sở</Link></section>;
  if (access) return <QueryState pending={false} error={access} redirectOnUnauthorized={false} retry={() => { setWriteAccess(null); void gym.refetch(); void regs.refetch(); void apts.refetch(); }} />;
  return <div className="admin-pt-workspace">
    <nav className="gym-actions admin-membership-breadcrumb" aria-label="Đường dẫn"><Link to="/admin/gyms">Quản trị Gym</Link><span aria-hidden="true">/</span><Link to={`/admin/gyms/${gymId}`}>{gym.data?.gym_name || 'Cơ sở'}</Link><span aria-hidden="true">/</span><span aria-current="page">Giám sát PT</span></nav>
    <PageHeader title="Đăng ký PT và lịch tập tại Gym" subtitle="Giám sát đăng ký và lịch sử tập trong phạm vi cơ sở đang chọn." />
    <QueryState pending={gym.isPending} error={gym.error} redirectOnUnauthorized={false} retry={gym.refetch} />
    {gym.data && !gym.isError && <section className="admin-scope" aria-label="Cơ sở đang chọn"><h2>{gym.data.gym_name}</h2><StatusBadge status={gym.data.status} /><p>{gym.data.address}</p>{gym.data.status === 'INACTIVE' && <p>Cơ sở ngừng hoạt động; lịch sử đăng ký và lịch tập vẫn được tra cứu.</p>}</section>}
    <p>Lịch hiển thị theo giờ Việt Nam (UTC+7). Admin xem lịch; PT hoặc Manager xử lý các buổi tập.</p>
    <button ref={refresh} className="btn-secondary" disabled={blocked || regs.isFetching || apts.isFetching || gym.isFetching} onClick={() => { void gym.refetch(); void regs.refetch(); void apts.refetch(); }}>Làm mới danh sách</button>
    {recovered && <p role="status">{recovered}: trang trước không còn dữ liệu; đã chuyển về trang phù hợp.</p>}
    {selected && <AdminRegistrationEnd row={selected} blocked={gym.isError || gym.isFetching} ready={!regs.isError && !apts.isError && !regs.isFetching && !apts.isFetching} close={close} denied={setWriteAccess} onBusy={setBusy} />}
    {gym.data && !gym.isError && <div className="admin-pt-sections">
      <section className="management-card" aria-label="Đăng ký PT" aria-busy={regs.isFetching || busy}><h2>Đăng ký PT</h2>
        <DashboardQueryFeedback query={regs} retry={() => { if (!busy) void regs.refetch(); }} />
        {regs.data && !regs.isError && <><p>{regs.data.pagination.totalItems} đăng ký</p>{regs.data.data.map(row => <AdminRegistrationRow key={row.registration_id} row={row} disabled={blocked || regs.isFetching || apts.isFetching || apts.isError || gym.isFetching} open={(item, button) => { opener.current = button; setSelected(item); }} />)}
          {!regs.data.data.length && <p>Chưa có đăng ký PT.</p>}<fieldset className="gym-fieldset" disabled={blocked || regs.isFetching}><legend className="sr-only">Chọn trang đăng ký PT</legend><Pager pagination={regs.data.pagination} onPage={setRegPage} /></fieldset></>}
      </section>
      <section className="management-card" aria-label="Lịch tập" aria-busy={apts.isFetching}><h2>Lịch tập</h2>
        <DashboardQueryFeedback query={apts} retry={() => { if (!busy) void apts.refetch(); }} />
        {apts.data && !apts.isError && <><p>{apts.data.pagination.totalItems} lịch tập</p>{apts.data.data.map(row => <AdminAppointmentRow key={row.appointment_id} row={row} />)}
          {!apts.data.data.length && <p>Chưa có lịch tập.</p>}<fieldset className="gym-fieldset" disabled={blocked || apts.isFetching}><legend className="sr-only">Chọn trang lịch tập</legend><Pager pagination={apts.data.pagination} onPage={setAptPage} /></fieldset></>}
      </section>
    </div>}
  </div>;
};
export const AdminPtWorkspacePage = () => {
  const { gymId = '' } = useParams(), { user } = useAuth();
  return <AdminGymPt key={`${user?.user_id}:${gymId}`} gymId={gymId} />;
};
