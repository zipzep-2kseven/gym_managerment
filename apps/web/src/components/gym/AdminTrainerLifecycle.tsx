import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useGymMutation } from '../../hooks/useGym';
import { gymService } from '../../services/gym.service';
import { readTrainerLifecycle } from '../../services/admin-trainer-lifecycle.service';
import { ApiClientError } from '../../services/api-client';
import { MutationError, QueryState } from './GymUi';
import type { ManagedTrainer, Status } from '../../types/gym.types';

export const AdminTrainerLifecycle = ({ gymId, trainer, onClose, onSaved, onReload }: {
  gymId: string; trainer: ManagedTrainer; onClose: () => void; onSaved: (message: string) => void; onReload: () => Promise<boolean>;
}) => {
  const { user, refreshSession } = useAuth();
  const target: Status = trainer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const title = target === 'INACTIVE' ? 'Xác nhận ngừng phân công PT' : 'Xác nhận kích hoạt phân công PT';
  const heading = useRef<HTMLHeadingElement>(null), sending = useRef(false);
  const mounted = useRef(false);
  const [needsRead, setNeedsRead] = useState(false);
  const [reading, setReading] = useState(false);
  const check = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, gymId, 'trainer-lifecycle', trainer.gym_trainer_id, target],
    queryFn: ({ signal }) => readTrainerLifecycle(gymId, trainer.gym_trainer_id, target, signal), retry: false, staleTime: 0, gcTime: 0 });
  const mutation = useGymMutation(() => gymService.trainerStatus(gymId, trainer.gym_trainer_id, target), { affectsAccounts: true });
  useEffect(() => { mounted.current = true; heading.current?.focus(); return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !sending.current && heading.current?.parentElement?.contains(document.activeElement)) {
        event.preventDefault(); onClose();
      }
    };
    document.addEventListener('keydown', cancelOnEscape);
    return () => document.removeEventListener('keydown', cancelOnEscape);
  }, [onClose]);
  useEffect(() => {
    if (check.error instanceof ApiClientError && [401, 403].includes(check.error.statusCode)) void refreshSession();
  }, [check.error, refreshSession]);
  const reload = async () => {
    setReading(true); setNeedsRead(true);
    const result = await check.refetch();
    if (!mounted.current) return;
    const listRead = await onReload();
    if (!mounted.current) return;
    if (!result.isError && listRead) { setNeedsRead(false); mutation.reset(); }
    setReading(false);
  };
  const pending = reading || mutation.isPending || check.isFetching;
  const confirm = () => {
    if (sending.current || pending || needsRead || check.isError || !check.data || check.data.problem) return;
    sending.current = true;
    mutation.mutate(undefined, {
      onSuccess: () => onSaved(target === 'INACTIVE' ? 'Đã ngừng phân công PT. Tài khoản và lịch sử được giữ nguyên.' : 'Đã kích hoạt phân công PT. Tình trạng nhận học viên được giữ nguyên.'),
      onError: () => { sending.current = false; setNeedsRead(true); },
    });
  };
  return <section className="admin-trainer-confirm" aria-labelledby="trainer-confirm-title" aria-busy={pending}>
    <h2 id="trainer-confirm-title" ref={heading} tabIndex={-1}>{title}</h2>
    <p>Gym: {check.data?.gym.gym_name || gymId}</p><p>Gym ID: {gymId}</p>
    <p>Phân công: {trainer.gym_trainer_id}</p><p>User ID: {trainer.user_id}</p>
    <p>{target === 'INACTIVE' ? 'Giữ tài khoản, vai trò, lịch sử và tình trạng nhận học viên. Không hủy đăng ký hoặc lịch hẹn.' : 'Giữ ID, ngày tham gia và hồ sơ. Không tự đổi tình trạng nhận học viên hoặc thu hồi phân công ở Gym khác.'}</p>
    <QueryState pending={check.isPending} error={check.error} retry={reload} redirectOnUnauthorized={false} />
    {check.data && !check.isError && <>
      {check.data.counts && <p>Đăng ký PT đang mở: {check.data.counts.registrations} · Lịch hẹn đang mở: {check.data.counts.appointments} (bao gồm lịch quá giờ).</p>}
      {check.data.problem && <p role="status">{check.data.problem}</p>}
      <p>Điều kiện có thể thay đổi sau lần đọc này. Máy chủ sẽ kiểm tra lại khi xác nhận.</p>
    </>}
    <MutationError error={mutation.error} />
    {needsRead && <p role="status">Cần đọc lại điều kiện và danh sách trước khi xác nhận lại. Không tự gửi lại thao tác.</p>}
    <div className="gym-actions">
      <button className="btn-primary" disabled={pending || needsRead || check.isError || !check.data || !!check.data.problem} onClick={confirm}>{mutation.isPending ? 'Đang lưu…' : target === 'INACTIVE' ? 'Xác nhận ngừng PT' : 'Xác nhận kích hoạt PT'}</button>
      <button className="btn-secondary" disabled={pending} onClick={() => void reload()}>Đọc lại điều kiện</button>
      <button className="btn-secondary" disabled={mutation.isPending} onClick={onClose}>Hủy</button>
    </div>
  </section>;
};
