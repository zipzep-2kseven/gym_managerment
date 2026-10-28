import { PackageQueryState } from '../../components/package/PackageQueryState';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePackages, usePackageMutation } from '../../hooks/usePackages';
import { useListFilters } from '../../hooks/useListFilters';
import { useManagerGymId } from '../gym/ManagerGymPage';
import { packageService } from '../../services/package.service';
import type { GymPackage } from '../../types/package.types';
import { ConfirmAction, MutationError, Pager } from '../../components/gym/GymUi';
import { PackageForm } from '../../components/package/PackageForm';
import { PackageSummary } from '../../components/package/PackageSummary';
import { PackageToolbar } from '../../components/package/PackageToolbar';
const ManagedPackageRow = ({ item, edit, editing }: { item: GymPackage; edit: () => void; editing: boolean }) => {
  const mutation = usePackageMutation(item.gym_id, () => packageService.status(item.gym_id, item.package_id, item.status !== 'ACTIVE'));
  return <article className="package-row"><div><PackageSummary item={item} managed /><MutationError error={mutation.error} /></div>
    <div className="gym-actions"><button className="btn-secondary" disabled={editing || mutation.isPending} onClick={edit}>Sửa gói {item.package_name}</button>
      <ConfirmAction label={`${item.status === 'ACTIVE' ? 'Ngừng bán' : 'Mở bán'} ${item.package_name}`} pending={mutation.isPending} onConfirm={() => mutation.mutate()} />
    </div>
  </article>;
};
export const ManagedPackagesPage = ({ admin = false }: { admin?: boolean }) => {
  const { gymId: routeId = '' } = useParams();
  const managerId = useManagerGymId();
  const gymId = admin ? routeId : managerId;
  return <PackageCatalog key={gymId} gymId={gymId} admin={admin} />;
};
const PackageCatalog = ({ gymId, admin }: { gymId: string; admin: boolean }) => {
  const { query, setFilter } = useListFilters('package_name', true);
  const packages = usePackages(gymId, query, true);
  const [editing, setEditing] = useState<GymPackage | 'new' | null>(null);
  return <><Link to={admin ? `/admin/gyms/${gymId}` : '/manager/gym'}>Thông tin Gym</Link>
    <div className="gym-heading"><h1>Quản lý gói tập</h1>{!editing && packages.data && !packages.isError && <button className="btn-primary" onClick={() => setEditing('new')}>Tạo gói mới</button>}</div>
    <p>Ngừng bán chỉ ẩn gói khỏi danh sách công khai; thẻ hội viên đã mua được giữ nguyên.</p>
    <PackageToolbar query={query} setFilter={setFilter} managed />
    <PackageQueryState pending={packages.isPending} error={packages.error} retry={packages.refetch} />
    {packages.data && !packages.isError && <>
      {editing && <PackageForm key={editing === 'new' ? 'new' : editing.package_id} gymId={gymId} item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      <div className="package-list">{packages.data.data.map(item => <ManagedPackageRow key={item.package_id} item={item} editing={!!editing} edit={() => setEditing(item)} />)}</div>
      {!packages.data.data.length && <p>Chưa có gói tập phù hợp.</p>}
      <Pager pagination={packages.data.pagination} onPage={page => setFilter('page', String(page))} />
    </>}
  </>;
};
