import { PageHeader } from '../../components/management/PageHeader';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { QueryState } from '../../components/gym/GymUi';
import { adminUserService } from '../../services/admin-user.service';
export const AdminRolesPage = () => {
  const {user} = useAuth();
  const query = useQuery({queryKey: ['admin-roles',user?.user_id], queryFn: ({signal}) => adminUserService.roles(signal)});
  return <><PageHeader title="Vai trò hệ thống" subtitle="Bốn vai trò hiện hành. Danh mục này chỉ để tra cứu." action={<div className="gym-actions"><Link className="btn-secondary" to="/admin/users">Quản lý tài khoản</Link><button className="btn-secondary" onClick={() => void query.refetch()}>Tải lại dữ liệu</button></div>} />
    <QueryState pending={query.isPending} error={query.error} retry={query.refetch} />
    {query.data && !query.isError && <div className="admin-role-grid">{query.data.map(role => <article className="management-card" key={role.role_id}><h2>{role.role_name}</h2><p>{role.description || 'Chưa có mô tả.'}</p></article>)}{!query.data.length && <p>Chưa có vai trò hệ thống.</p>}</div>}
  </>;
};
