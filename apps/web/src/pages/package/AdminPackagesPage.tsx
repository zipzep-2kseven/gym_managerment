import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAdminGymContext } from '../../hooks/useAdminGymContext';
import { useAdminPackages } from '../../hooks/useAdminPackages';
import { PageHeader } from '../../components/management/PageHeader';
import { DashboardQueryFeedback } from '../../components/management/DashboardQueryFeedback';
import { MutationError, Pager, QueryState } from '../../components/gym/GymUi';
import { PackageToolbar } from '../../components/package/PackageToolbar';
import { AdminPackageEditor } from './AdminPackageEditor';
import { AdminPackageRow } from './AdminPackageRow';
import { AdminPackageRecovery } from './AdminPackageRecovery';
import { AdminPackageConfirmation } from './AdminPackageConfirmation';
import type { GymPackage } from '../../types/package.types';
import { ApiClientError } from '../../services/api-client';

type Selection = { kind: 'new' } | { kind: 'edit' | 'status'; row: GymPackage };
export const AdminPackagesPage = () => {
  const { gymId = '' } = useParams(), { user } = useAuth();
  return <AdminPackageCatalog key={`${user?.user_id}:${gymId}`} gymId={gymId} />;
};
const AdminPackageCatalog = ({ gymId }: { gymId: string }) => {
  const { gym, validGym, enabled } = useAdminGymContext(gymId);
  const { query, filters, setFilter, action, denied } = useAdminPackages(gymId, enabled && !!gym.data && !gym.isError);
  const [selection, setSelection] = useState<Selection | null>(null), [revision, setRevision] = useState(0);
  const root = useRef<HTMLElement>(null), opener = useRef('new'), restore = useRef(false);
  const close = () => { if (action.locked) return; setSelection(null); restore.current = true; };
  useEffect(() => { const heading = root.current?.querySelector<HTMLElement>('h1'); if (heading) { heading.tabIndex = -1; heading.focus(); } }, []);
  useEffect(() => {
    if (selection || !restore.current) return;
    restore.current = false;
    const controls = root.current?.querySelectorAll<HTMLElement>('[data-package-opener]');
    const target = Array.from(controls || []).find(control => control.dataset.packageOpener === opener.current && !control.hasAttribute('disabled'));
    (target || root.current?.querySelector<HTMLElement>('h1'))?.focus();
  }, [selection]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !selection || action.locked || !root.current?.contains(document.activeElement)) return;
      event.preventDefault(); setSelection(null); restore.current = true;
    };
    document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape);
  }, [selection, action.locked]);
  useEffect(() => {
    if (selection?.kind === 'status' && action.receipt && !action.locked) { setSelection(null); restore.current = true; }
  }, [selection, action.receipt, action.locked]);
  const open = (kind: 'edit' | 'status', row: GymPackage) => { action.reset(); opener.current = `${kind}-${row.package_id}`; setSelection({ kind, row }); };
  const accept = () => {
    action.acceptRead();
    if (selection?.kind === 'edit' && action.current) { setSelection({ kind: 'edit', row: action.current }); setRevision(value => value + 1); return; }
    setSelection(null); restore.current = true;
  };
  const gymDenied = gym.error instanceof ApiClientError && [401, 403].includes(gym.error.statusCode);
  const access = denied || (gym.isError && (!gym.data || gymDenied) ? gym.error : null);
  const contextBlocked = gym.isError || gym.isFetching;
  const blocked = !!selection || action.locked || query.isError || query.isFetching || contextBlocked;
  const reviewingCreate = action.uncertain?.kind === 'create' && action.checked && !action.reading && !action.pending;
  return <section ref={root} className="admin-packages">
    <Link to={`/admin/gyms/${gymId}`}>Thông tin Gym</Link>
    <PageHeader title="Quản lý gói tập" subtitle={gym.data ? <>{gym.data.gym_name} · {gym.data.status === 'ACTIVE' ? 'Gym đang hoạt động' : 'Gym ngừng hoạt động'}</> : 'Catalog theo cơ sở'}
      action={<button className="btn-primary" data-package-opener="new" disabled={blocked || !query.data || !!access || !validGym} onClick={() => { action.reset(); opener.current = 'new'; setSelection({ kind: 'new' }); }}>Tạo gói mới</button>} />
    {!validGym ? <p role="alert">Mã Gym không hợp lệ.</p> : access ? <QueryState pending={false} error={access} retry={() => void (denied ? query.refetch() : gym.refetch())} redirectOnUnauthorized={false} />
      : gym.isPending ? <QueryState pending error={null} retry={() => void gym.refetch()} /> : <>
        {gym.isError && <p>Thông tin Gym chưa được làm mới. Biểu mẫu vẫn giữ bản nháp; tải lại thông tin trước khi lưu.</p>}
        <DashboardQueryFeedback query={{ isPending: gym.isPending, isFetching: gym.isFetching, isError: gym.isError, dataUpdatedAt: gym.isError ? gym.dataUpdatedAt : 0 }} retry={() => void gym.refetch()} />
        <p className="admin-package-policy">Ngừng bán chỉ ẩn gói khỏi danh sách công khai; thẻ hội viên đã mua được giữ nguyên. Đổi giá hoặc thời hạn không thay đổi giao dịch và thẻ đã mua.</p>
        {gym.data?.status === 'INACTIVE' && <p className="admin-package-policy">Gym đang ngừng hoạt động. Bạn vẫn quản trị catalog nội bộ; mở bán gói không đưa Gym trở lại danh sách công khai.</p>}
        {action.receipt && <p role="status" className="alert-banner alert-success">{action.receipt.action.kind === 'create' ? 'Gói tập đã được tạo.' : action.receipt.action.kind === 'update' ? 'Thay đổi đã được lưu.' : `Đã ${action.receipt.row.status === 'ACTIVE' ? 'mở bán' : 'ngừng bán'} gói ${action.receipt.row.package_name}.`}</p>}
        <MutationError error={action.error} />
        <AdminPackageRecovery action={action} catalogReady={!query.isError && !query.isFetching && !contextBlocked} accept={accept} />
        {selection && selection.kind !== 'status' && <AdminPackageEditor key={`${selection.kind === 'new' ? 'new' : selection.row.package_id}:${revision}`} item={selection.kind === 'edit' ? selection.row : undefined}
          locked={action.locked || query.isError || query.isFetching || contextBlocked} pending={action.pending || action.reading} saved={action.receipt?.action.kind === 'create'} close={close} send={action.send} />}
        {selection?.kind === 'status' && <AdminPackageConfirmation row={selection.row} locked={action.locked || query.isError || query.isFetching || contextBlocked} pending={action.pending}
          close={close} send={() => void action.send({ kind: 'status', row: selection.row, active: selection.row.status !== 'ACTIVE' })} />}
        <section className="gym-panel" aria-label="Catalog gói tập">
          <fieldset disabled={!reviewingCreate && (!!selection || action.locked)} className="admin-package-toolbar"><PackageToolbar query={filters} setFilter={setFilter} managed /></fieldset>
          <DashboardQueryFeedback query={query} retry={() => void query.refetch()} />
          {query.data && <>
            <div className="admin-package-list">{query.data.data.map(item => <AdminPackageRow key={item.package_id} item={item} blocked={blocked} open={open} />)}</div>
            {!query.data.data.length && <p className="admin-package-empty">Chưa có gói tập phù hợp.</p>}
            <fieldset disabled={(!reviewingCreate && (!!selection || action.locked)) || query.isFetching || query.isError} className="admin-package-toolbar"><Pager pagination={query.data.pagination} onPage={page => setFilter('page', String(page))} /></fieldset>
          </>}
        </section>
      </>}
  </section>;
};
