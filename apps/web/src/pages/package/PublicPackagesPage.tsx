import { PackageQueryState } from '../../components/package/PackageQueryState';
import { Link, useParams } from 'react-router-dom';
import { usePackage, usePackages } from '../../hooks/usePackages';
import { useListFilters } from '../../hooks/useListFilters';
import { Pager } from '../../components/gym/GymUi';
import { PackageToolbar } from '../../components/package/PackageToolbar';
import { PackageSummary } from '../../components/package/PackageSummary';
export const PublicPackagesPage = () => {
  const { gymId = '' } = useParams();
  const { query, setFilter } = useListFilters('package_name');
  const packages = usePackages(gymId, query);
  return <><Link to={`/gyms/${gymId}`}>Thông tin Gym</Link><h1>Gói tập tại Gym</h1>
    <p>Chọn gói tập và xem thời hạn, giá cùng thông tin chi tiết.</p>
    <PackageToolbar query={query} setFilter={setFilter} />
    <PackageQueryState pending={packages.isPending} error={packages.error} retry={packages.refetch} />
    {packages.data && !packages.isError && <>
      <div className="package-list">{packages.data.data.map(item => <article className="package-row" key={item.package_id}>
        <div><PackageSummary item={item} /></div><Link className="btn-secondary" to={`/gyms/${gymId}/packages/${item.package_id}`}>Xem gói {item.package_name}</Link>
      </article>)}</div>
      {!packages.data.data.length && <p>Chưa có gói tập phù hợp.</p>}
      <Pager pagination={packages.data.pagination} onPage={page => setFilter('page', String(page))} />
    </>}
  </>;
};
export const PublicPackagePage = () => {
  const { gymId = '', packageId = '' } = useParams();
  const item = usePackage(gymId, packageId);
  return <><Link to={`/gyms/${gymId}/packages`}>Danh sách gói tập</Link>
    <PackageQueryState pending={item.isPending} error={item.error} retry={item.refetch} />
    {item.data && !item.isError && <section className="gym-panel"><h1>{item.data.package_name}</h1>
      <PackageSummary item={item.data} showName={false} /><p role="status">Thanh toán mô phỏng để demo; không phát sinh tiền thật.</p>
      <div className="gym-actions"><Link className="btn-primary" to={`/gyms/${gymId}/packages/${packageId}/checkout`}>Tiếp tục thanh toán demo</Link><Link to={`/gyms/${gymId}`}>Xem thông tin liên hệ Gym</Link></div>
    </section>}
  </>;
};
