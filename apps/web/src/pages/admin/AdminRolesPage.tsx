import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { QueryState } from '../../components/gym/GymUi';
import { adminUserService } from '../../services/admin-user.service';
export const AdminRolesPage = () => {
  const {user} = useAuth();
  const query = useQuery({queryKey: ['admin-roles',user?.user_id], queryFn: ({signal}) => adminUserService.roles(signal)});
  return <><Link to="/admin/users">Quản lý tài khoản</Link><h1>Vai trò hệ thống</h1>
    <p>Danh mục chỉ để tra cứu. Guest là khách chưa đăng nhập, không phải vai trò được cấp cho tài khoản.</p>
    <QueryState pending={query.isPending} error={query.error} retry={query.refetch} />
    {query.data && !query.isError && <div className="account-list">{query.data.map(role => <article className="account-row" key={role.role_id}><h2>{role.role_name}</h2><p>{role.description || 'Chưa có mô tả.'}</p></article>)}{!query.data.length && <p>Chưa có vai trò hệ thống.</p>}</div>}
  </>;
};
