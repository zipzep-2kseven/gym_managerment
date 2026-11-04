import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { gymService } from '../../services/gym.service';
import { useAuth } from '../../hooks/useAuth';
import { useGymMutation } from '../../hooks/useGym';
import { useListFilters } from '../../hooks/useListFilters';
import { ConfirmAction, MutationError, Pager, QueryState, StatusBadge } from '../../components/gym/GymUi';
import { StaffForm } from '../../components/gym/StaffForm';
import { PageHeader } from '../../components/management/PageHeader';
import { availabilityLabel } from './PublicTrainersPage';
import type { ListQuery, Status } from '../../types/gym.types';

export const AdminTrainersPage = () => {
  const { gymId = '' } = useParams();
  const { user } = useAuth();
  const { query: rawQuery, setFilter } = useListFilters('specialization', true);

  const query: ListQuery = {
    ...rawQuery,
    pageSize: 20,
    sortBy: ['created_at', 'joined_at', 'specialization'].includes(rawQuery.sortBy || '') ? rawQuery.sortBy : 'created_at',
    sortOrder: rawQuery.sortOrder || 'desc',
  };

  const gym = useQuery({
    queryKey: ['gyms', 'admin', user?.user_id, gymId],
    queryFn: ({ signal }) => gymService.adminGym(gymId, signal),
    enabled: !!gymId,
  });

  const trainers = useQuery({
    queryKey: ['gyms', 'management', user?.user_id, gymId, 'trainers', query],
    queryFn: () => gymService.managedTrainers(gymId, query),
    enabled: !!gymId,
  });

  const mutation = useGymMutation(({ id, status }: { id: string; status: Status }) =>
    gymService.trainerStatus(gymId, id, status)
  );

  const isGymInactive = gym.data?.status === 'INACTIVE';

  return (
    <>
      <PageHeader
        title="Huấn luyện viên tại Gym"
        subtitle="Quản lý danh sách, tiếp nhận và điều chỉnh trạng thái phân công huấn luyện viên."
        action={
          <div className="gym-actions">
            <Link className="btn-secondary" to={`/admin/gyms/${gymId}`}>Thông tin cơ sở</Link>
            {!isGymInactive && (
              <Link className="btn-primary" to={`/admin/gyms/${gymId}/trainers/assign`}>
                Tiếp nhận PT
              </Link>
            )}
          </div>
        }
      />

      <QueryState
        pending={gym.isPending}
        error={gym.error}
        retry={gym.refetch}
      />

      {gym.data && !gym.isError && (
        <>
          <section className="admin-scope" aria-label="Cơ sở đang chọn">
            <h2>{gym.data.gym_name}</h2>
            <StatusBadge status={gym.data.status} />
            <p>{gym.data.address}</p>
            {isGymInactive && (
              <div className="alert-banner alert-info" role="status" style={{ marginTop: '12px' }}>
                Gym đang ngừng hoạt động; bạn vẫn có thể tra cứu danh sách phân công.
              </div>
            )}
          </section>

          <form
            className="gym-toolbar"
            onSubmit={e => {
              e.preventDefault();
              setFilter('search', String(new FormData(e.currentTarget).get('search') || ''));
            }}
          >
            <label className="form-group">
              Chuyên môn hoặc tiểu sử
              <input className="form-input" name="search" defaultValue={query.search} />
            </label>
            <button className="btn-primary" type="submit">Tìm kiếm</button>
            <label className="form-group">
              Trạng thái phân công
              <select
                className="form-input"
                value={query.status || ''}
                onChange={e => setFilter('status', e.target.value)}
              >
                <option value="">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Ngừng hoạt động</option>
              </select>
            </label>
            <label className="form-group">
              Sắp xếp
              <select
                className="form-input"
                value={`${query.sortBy}_${query.sortOrder}`}
                onChange={e => {
                  const [sort, order] = e.target.value.split('_');
                  setFilter('sortBy', sort);
                  setFilter('sortOrder', order);
                }}
              >
                <option value="created_at_desc">Mới nhất</option>
                <option value="created_at_asc">Cũ nhất</option>
                <option value="joined_at_desc">Ngày tham gia (mới nhất)</option>
                <option value="joined_at_asc">Ngày tham gia (cũ nhất)</option>
                <option value="specialization_asc">Chuyên môn (A-Z)</option>
                <option value="specialization_desc">Chuyên môn (Z-A)</option>
              </select>
            </label>
          </form>

          <MutationError error={mutation.error} />

          <QueryState
            pending={trainers.isPending}
            error={trainers.error}
            retry={trainers.refetch}
          />

          {trainers.data && !trainers.isError && (
            <>
              <div className="gym-management-list">
                {trainers.data.data.map(pt => (
                  <article className="gym-management-row" key={pt.gym_trainer_id}>
                    <div>
                      <h2>{pt.specialization || 'Huấn luyện viên'}</h2>
                      <p className="gym-user-id">User ID: <code>{pt.user_id}</code></p>
                      <p>
                        {pt.experience_years !== null ? `${pt.experience_years} năm kinh nghiệm` : 'Chưa cập nhật kinh nghiệm'} ·{' '}
                        <span>{availabilityLabel[pt.availability]}</span>
                      </p>
                      {pt.bio && <p className="gym-bio gym-preserve">{pt.bio}</p>}
                      <p>Ngày tham gia: {new Date(pt.joined_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
                      <StatusBadge status={pt.status} />
                    </div>
                    <div className="gym-actions">
                      {pt.status === 'ACTIVE' ? (
                        <ConfirmAction
                          label="Ngừng phân công PT"
                          pending={mutation.isPending}
                          onConfirm={() => mutation.mutate({ id: pt.gym_trainer_id, status: 'INACTIVE' })}
                        />
                      ) : (
                        !isGymInactive ? (
                          <ConfirmAction
                            label="Kích hoạt phân công PT"
                            pending={mutation.isPending}
                            onConfirm={() => mutation.mutate({ id: pt.gym_trainer_id, status: 'ACTIVE' })}
                          />
                        ) : (
                          <button
                            className="btn-secondary"
                            disabled
                            title="Không thể kích hoạt khi cơ sở đang ngừng hoạt động"
                          >
                            Kích hoạt phân công PT
                          </button>
                        )
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {!trainers.data.data.length && <p>Chưa có huấn luyện viên phù hợp.</p>}
              <Pager
                pagination={trainers.data.pagination}
                onPage={page => setFilter('page', String(page))}
              />
            </>
          )}
        </>
      )}
    </>
  );
};

export const AdminAssignTrainerPage = () => {
  const { gymId = '' } = useParams();
  const { user } = useAuth();

  const gym = useQuery({
    queryKey: ['gyms', 'admin', user?.user_id, gymId],
    queryFn: ({ signal }) => gymService.adminGym(gymId, signal),
    enabled: !!gymId,
  });

  const isGymInactive = gym.data?.status === 'INACTIVE';

  return (
    <>
      <PageHeader
        title="Tiếp nhận huấn luyện viên"
        subtitle={`Gán tài khoản HLV có sẵn hoặc cấp tài khoản HLV mới cho cơ sở ${gym.data?.gym_name || ''}.`}
        action={
          <Link className="btn-secondary" to={`/admin/gyms/${gymId}/trainers`}>
            Danh sách HLV
          </Link>
        }
      />
      <QueryState pending={gym.isPending} error={gym.error} retry={gym.refetch} />
      {gym.data && !gym.isError && (
        <>
          {isGymInactive && (
            <div className="alert-banner alert-warning" role="alert" style={{ marginBottom: '16px' }}>
              Cơ sở đang ngừng hoạt động. Không thể tiếp nhận thêm huấn luyện viên vào cơ sở này.
            </div>
          )}
          <StaffForm key={gymId} gymId={gymId} kind="PT" blocked={isGymInactive} />
        </>
      )}
    </>
  );
};
