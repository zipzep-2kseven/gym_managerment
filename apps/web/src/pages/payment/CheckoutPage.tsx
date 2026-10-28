import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePackage } from '../../hooks/usePackages';
import { PackageQueryState } from '../../components/package/PackageQueryState';
import { PackageSummary, displayPackagePrice } from '../../components/package/PackageSummary';
import { MutationError } from '../../components/gym/GymUi';
import { paymentService } from '../../services/payment.service';
import { ApiClientError } from '../../services/api-client';
export const CheckoutPage = () => {
  const { gymId = '', packageId = '' } = useParams();
  return <CheckoutForm key={`${gymId}:${packageId}`} gymId={gymId} packageId={packageId} />;
};
const CheckoutForm = ({ gymId, packageId }: { gymId: string; packageId: string }) => {
  const item = usePackage(gymId, packageId);
  const [key] = useState(() => crypto.randomUUID());
  const [method, setMethod] = useState('CARD');
  const [started, setStarted] = useState(false);
  const client = useQueryClient(); const { refreshSession } = useAuth(); const navigate = useNavigate();
  const payment = useMutation({ mutationFn: () => paymentService.checkout(gymId, packageId, method, key), retry: false,
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['payments'] }), client.invalidateQueries({ queryKey: ['memberships'] })]); },
    onError: async error => {
      if (!(error instanceof ApiClientError)) return;
      if ([401, 403].includes(error.statusCode)) await refreshSession();
      if (error.code === 'PASSWORD_CHANGE_REQUIRED') navigate('/change-password');
    },
  });
  return <><Link to={`/gyms/${gymId}/packages/${packageId}`}>Chi tiết gói tập</Link><h1>Thanh toán demo</h1>
    <p className="alert-banner" role="note">Đây là thanh toán mô phỏng. Không thu tiền thật; các phương thức đều mô phỏng thành công khi yêu cầu hợp lệ.</p>
    {payment.data ? <section className="gym-panel"><h2>Thanh toán mô phỏng thành công</h2>
      <p role="status">Thẻ hội viên demo đã được tạo.</p><p>Giá mua: {displayPackagePrice(payment.data.membership.purchase_price)} VND</p>
      <p>Thời hạn: {payment.data.membership.start_date} đến {payment.data.membership.end_date}</p>
      <div className="gym-actions"><Link to="/memberships">Thẻ hội viên của tôi</Link><Link to="/payments">Lịch sử thanh toán</Link></div>
    </section> : <>
      <PackageQueryState pending={item.isPending} error={item.error} retry={item.refetch} />
      {item.data && !item.isError && <form className="gym-panel" onSubmit={e => { e.preventDefault(); if (payment.isPending) return; setStarted(true); payment.mutate(); }}>
        <PackageSummary item={item.data} /><MutationError error={payment.error} />
        <label className="form-group">Phương thức thanh toán (demo)<select className="form-input" value={method} disabled={started || payment.isPending} onChange={e => setMethod(e.target.value)}>
          <option value="CARD">Thẻ ngân hàng</option><option value="BANK_TRANSFER">Chuyển khoản</option><option value="WALLET">Ví điện tử</option>
        </select></label>
        <button className="btn-primary" disabled={payment.isPending} type="submit">{payment.isPending ? 'Đang xử lý…' : payment.isError ? 'Thử lại thanh toán demo' : 'Thanh toán demo'}</button>
        <p>Giá và thời hạn được xác nhận lại tại máy chủ khi thanh toán.</p>
      </form>}
    </>}
  </>;
};
