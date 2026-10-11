import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../services/payment.service';
import { Pager } from '../../components/gym/GymUi';
import { PackageQueryState } from '../../components/package/PackageQueryState';
import { displayPackagePrice } from '../../components/package/PackageSummary';
export const PaymentHistoryPage = () => {
  const { user } = useAuth(); const [params, setParams] = useSearchParams();
  const page = Math.max(1, Math.min(1000000, Number(params.get('page')) || 1));
  const result = useQuery({ queryKey: ['payments', user?.user_id, page], queryFn: ({ signal }) => paymentService.payments(page, signal) });
  return <><h1>Lịch sử thanh toán</h1><Link to="/memberships">Thẻ hội viên của tôi</Link><PackageQueryState pending={result.isPending} error={result.error} retry={result.refetch} />
    {result.data && !result.isError && <>{result.data.data.map(p => <article className="gym-management-row" key={p.payment_id}>
      <div><h2>{p.demo ? 'Giao dịch demo' : 'Giao dịch'}</h2><p>{displayPackagePrice(p.amount)} VND · {p.payment_status === 'SUCCESS' ? 'Thành công' : p.payment_status}</p>
        <p>{new Date(p.created_at).toLocaleString('vi-VN')} · {p.payment_method.replace('DEMO:', '')}</p></div><Link to={`/gyms/${p.gym_id}`}>Thông tin Gym</Link>
    </article>)}{!result.data.data.length && <p>Chưa có giao dịch.</p>}<Pager pagination={result.data.pagination} onPage={n => setParams({ page: String(n) })} /></>}
  </>;
};
export const MembershipsPage = () => {
  const { user } = useAuth(); const [params, setParams] = useSearchParams();
  const page = Math.max(1, Math.min(1000000, Number(params.get('page')) || 1));
  const result = useQuery({ queryKey: ['memberships', user?.user_id, page], queryFn: ({ signal }) => paymentService.memberships(page, signal) });
  return <><h1>Thẻ hội viên của tôi</h1><Link to="/payments">Lịch sử thanh toán</Link><PackageQueryState pending={result.isPending} error={result.error} retry={result.refetch} />
    {result.data && !result.isError && <>{result.data.data.map(m => <article className="gym-management-row" key={m.membership_id}>
      <div><h2>{m.demo ? 'Thẻ hội viên demo' : 'Thẻ hội viên'}</h2><p>{m.start_date} đến {m.end_date}</p><p>Giá mua: {displayPackagePrice(m.purchase_price)} VND</p>
        <span className="badge badge-role">{m.status === 'ACTIVE' ? 'Đang hoạt động' : m.status}</span></div><div className="gym-actions"><Link to={`/gyms/${m.gym_id}`}>Thông tin Gym</Link>{m.status === 'ACTIVE' && <Link className="btn-primary" to={`/gyms/${m.gym_id}/pt-register?membership=${m.membership_id}`}>Đăng ký PT</Link>}</div>
    </article>)}{!result.data.data.length && <p>Chưa có thẻ hội viên.</p>}<Pager pagination={result.data.pagination} onPage={n => setParams({ page: String(n) })} /></>}
  </>;
};
