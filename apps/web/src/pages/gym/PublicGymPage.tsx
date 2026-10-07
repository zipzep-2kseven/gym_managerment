import { Link, useParams } from 'react-router-dom';
import { useGym } from '../../hooks/useGym';
import { QueryState, SafeImage } from '../../components/gym/GymUi';
export const PublicGymPage = () => {
  const { gymId = '' } = useParams();
  const gym = useGym(gymId);
  if (!gym.data || gym.isError) return <QueryState pending={gym.isPending} error={gym.error} retry={gym.refetch} />;
  const data = gym.data;
  return <><Link to="/gyms">Tất cả phòng Gym</Link><section className="gym-detail-heading"><SafeImage url={data.logo_url} alt={data.gym_name} /><div><p className="gym-eyebrow">PHÒNG TẬP</p><h1>{data.gym_name}</h1><p>{data.address}</p></div></section>
    <div className="gym-actions"><Link className="btn-primary" to={`/gyms/${gymId}/packages`}>Đăng ký ngay</Link><Link className="btn-secondary" to={`/gyms/${gymId}/consultation`}>Đặt lịch tư vấn</Link></div>
    <div className="gym-detail-grid"><section className="gym-panel"><h2>Về phòng tập</h2><p className="gym-preserve">{data.description || 'Phòng Gym chưa bổ sung mô tả.'}</p><Link to={`/gyms/${gymId}/trainers`}>Khám phá đội ngũ PT</Link></section>
    <section className="gym-panel"><h2>Thông tin liên hệ</h2><dl><dt>Điện thoại</dt><dd>{data.phone || 'Chưa cập nhật'}</dd><dt>Email</dt><dd>{data.email || 'Chưa cập nhật'}</dd><dt>Giờ mở / đóng cửa</dt><dd>{data.opening_time?.slice(0, 5) || 'Chưa cập nhật'} / {data.closing_time?.slice(0, 5) || 'Chưa cập nhật'}</dd><dt>Tọa độ</dt><dd>{data.latitude ?? 'Chưa cập nhật'}, {data.longitude ?? 'Chưa cập nhật'}</dd></dl></section></div>
  </>;
};
