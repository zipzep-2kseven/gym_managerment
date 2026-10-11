import type { ListQuery } from '../../types/gym.types';
export const PackageToolbar = ({ query, setFilter, managed = false }: {
  query: ListQuery; setFilter: (key: string, value: string) => void; managed?: boolean;
}) => <form className="package-toolbar" onSubmit={e => {
  e.preventDefault(); setFilter('search', String(new FormData(e.currentTarget).get('search') || '').trim());
}}>
  <label className="form-group">Tên hoặc mô tả gói tập<input key={query.search || ''} className="form-input" name="search" defaultValue={query.search} /></label>
  <button className="btn-primary" type="submit">Tìm gói tập</button>
  <label className="form-group">Sắp xếp theo<select className="form-input" value={query.sortBy} onChange={e => setFilter('sortBy', e.target.value)}>
    <option value="package_name">Tên gói</option><option value="price">Giá</option><option value="duration_days">Thời hạn</option><option value="created_at">Ngày tạo</option>
  </select></label>
  <label className="form-group">Thứ tự<select className="form-input" value={query.sortOrder} onChange={e => setFilter('sortOrder', e.target.value)}>
    <option value="asc">Tăng dần</option><option value="desc">Giảm dần</option>
  </select></label>
  {managed && <label className="form-group">Trạng thái bán<select className="form-input" value={query.status || ''} onChange={e => setFilter('status', e.target.value)}>
    <option value="">Tất cả</option><option value="ACTIVE">Đang bán</option><option value="INACTIVE">Ngừng bán</option>
  </select></label>}
</form>;
