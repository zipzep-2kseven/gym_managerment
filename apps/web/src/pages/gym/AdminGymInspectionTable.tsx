import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/api-client';
import { galleryService } from '../../services/gallery.service';
import { reportService } from '../../services/report.service';
import { AdminDialog } from '../../components/admin/AdminDialog';
import { ActionIcon } from '../../components/admin/ActionIcon';
import { Pager, QueryState } from '../../components/gym/GymUi';
import { fieldLabels, inspectionValue, resourceColumns, resourceLabels } from './gym-inspection-catalog';
type Entry = Record<string, unknown> & { id: string };
const Photo = ({ src }: { src: string }) => {
  const [failed, setFailed] = useState(false);
  return failed ? <p role="status">Không tải được ảnh đính kèm.</p> : <img className="admin-inspection-photo" src={src} alt="Ảnh đính kèm" onError={() => setFailed(true)} />;
};
export const AdminGymInspectionTable = ({ gymId, resource }: { gymId: string; resource: string }) => {
  const { user } = useAuth();
  const [page, setPage] = useState(1), [search, setSearch] = useState(''), [term, setTerm] = useState('');
  const [selected, setSelected] = useState<Entry | null>(null);
  const query = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, gymId, 'inspection', resource, page, term],
    queryFn: ({ signal }) => apiClient.list<Entry>(`/admin/gyms/${gymId}/inspection/${resource}`, { params: { page, pageSize: 20, ...(term ? { search: term } : {}) }, signal }) });
  const columns = resourceColumns[resource];
  return <section className="admin-inspection-list" aria-label={resourceLabels[resource]}>
    <div className="admin-inspection-list-heading"><h2>{resourceLabels[resource]}</h2>
      {resource.endsWith('reviews') && <Link className="btn-secondary" to={`/admin/reviews?gym_id=${gymId}&kind=${resource === 'trainer-reviews' ? 'trainer' : 'gym'}`}>Mở kiểm duyệt</Link>}
      <form className="admin-list-search" onSubmit={event => { event.preventDefault(); setTerm(search.trim()); setPage(1); }}>
        <label className="sr-only" htmlFor="inspection-search">Tìm trong {resourceLabels[resource]}</label>
        <input id="inspection-search" className="form-input" type="search" placeholder="Tìm kiếm…" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} />
        <button className="admin-icon-action" aria-label="Tìm kiếm" title="Tìm kiếm"><ActionIcon kind="search" /></button>
      </form>
    </div>
    <QueryState pending={query.isPending} error={query.error} retry={query.refetch} />
    {query.data && !query.isError && <>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="admin-gym-table-scroll" role="region" aria-label={`Bảng ${resourceLabels[resource]}`} tabIndex={0}>
        <table className="admin-gym-table admin-inspection-table"><caption>{query.data.pagination.totalItems} kết quả</caption>
          <thead><tr>{columns.map(key => <th scope="col" key={key}>{fieldLabels[key]}</th>)}<th scope="col">Chi tiết</th></tr></thead>
          <tbody>{query.data.data.map(row => <tr key={row.id}>{columns.map(key => <td key={key}>
            {key === 'status' ? <span className={`admin-status is-${String(row[key]).toLowerCase()}`}>{inspectionValue(key, row[key])}</span> : <span className="admin-cell-preview">{inspectionValue(key, row[key])}</span>}
          </td>)}<td><button className="admin-icon-action" title="Xem chi tiết" aria-label={`Xem chi tiết ${inspectionValue(columns[0], row[columns[0]])}`} onClick={() => setSelected(row)}><ActionIcon kind="view" /></button></td></tr>)}</tbody>
        </table>{!query.data.data.length && <p className="admin-gym-empty">Không có dữ liệu phù hợp.</p>}
      </div>
      {query.data.pagination.totalPages > 1 && <Pager pagination={query.data.pagination} onPage={setPage} />}
      {selected && <AdminDialog title={`Chi tiết ${resourceLabels[resource]}`} drawer onClose={() => setSelected(null)}>
        <dl className="admin-gym-facts">{Object.entries(selected).filter(([key]) => fieldLabels[key]).map(([key, value]) => <div className="admin-inspection-fact" key={key}>
          <dt>{fieldLabels[key]}</dt><dd>{key === 'url' && /^https?:\/\//i.test(String(value)) ? <a href={String(value)} target="_blank" rel="noreferrer">{String(value)}</a> : inspectionValue(key, value)}</dd>
        </div>)}</dl>
        {resource === 'images' && <Photo src={galleryService.image({ image_id: selected.id, gym_id: gymId, caption: null, display_order: 0, updated_at: '' }, true)} />}
        {resource === 'reports' && selected.has_image === true && <Photo src={reportService.image(selected.id)} />}
      </AdminDialog>}
    </>}
  </section>;
};
