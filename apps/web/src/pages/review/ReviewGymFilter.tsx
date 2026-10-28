import { useEffect, useId, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { gymService } from '../../services/gym.service';
import { ApiClientError } from '../../services/api-client';
import { QueryState } from '../../components/gym/GymUi';

export const ReviewGymFilter = ({ value, change, disabled, onDenied }: {
  value: string; change: (id: string) => void; disabled: boolean; onDenied: (error: ApiClientError) => void;
}) => {
  const { user } = useAuth(), [open, setOpen] = useState(false), [draft, setDraft] = useState(''), [search, setSearch] = useState('');
  const [chosen, setChosen] = useState({ id: '', label: '' });
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), input = useRef<HTMLInputElement>(null);
  const panelId = useId(), inputId = useId();
  useEffect(() => { const timer = setTimeout(() => setSearch(draft.trim()), 250); return () => clearTimeout(timer); }, [draft]);
  const gyms = useInfiniteQuery({ queryKey: ['gyms', 'admin', 'review-filter', user?.user_id, search], initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => gymService.gyms({ page: pageParam, pageSize: 10, search, sortBy: 'gym_name', sortOrder: 'asc' }, true, signal),
    getNextPageParam: last => last.pagination.hasNextPage ? last.pagination.page + 1 : undefined, enabled: open });
  const selected = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, value], queryFn: ({ signal }) => gymService.adminGym(value, signal), enabled: !!value && chosen.id !== value });
  const error = gyms.error || selected.error;
  const denied = error instanceof ApiClientError && [401, 403].includes(error.statusCode) ? error : null;
  useEffect(() => { if (denied) onDenied(denied); }, [denied, onDenied]);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const outside = (event: MouseEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const label = value ? (chosen.id === value ? chosen.label : selected.data?.gym_name || 'Gym đã chọn') : 'Tất cả Gym';
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <div ref={root} className="admin-review-gym-picker">
    <span className="admin-filter-label" id={`${panelId}-label`}>Phòng Gym</span>
    <button ref={trigger} type="button" className="form-input admin-gym-picker-trigger" aria-label={`Lọc theo Gym: ${label}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId} disabled={disabled}
      onClick={() => setOpen(current => !current)}>{label}<span aria-hidden="true">⌄</span></button>
    {selected.error && !open && !denied && <button type="button" className="admin-text-link" onClick={() => void selected.refetch()}>Thử lại tên Gym</button>}
    {open && <div id={panelId} className="admin-gym-picker-panel" role="dialog" aria-label="Bộ chọn Gym">
      <div className="admin-gym-picker-heading"><label htmlFor={inputId}>Tìm phòng Gym</label><button type="button" className="admin-text-link" aria-label="Đóng bộ chọn Gym" onClick={close}>Đóng</button></div>
      <input ref={input} id={inputId} className="form-input" type="search" maxLength={100} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Tên hoặc địa chỉ…" />
      <button type="button" className="admin-gym-picker-option" aria-pressed={!value} onClick={() => { change(''); close(); }}>Tất cả Gym</button>
      <QueryState pending={gyms.isPending} error={gyms.error} retry={gyms.refetch} />
      {!gyms.isError && <div className="admin-gym-picker-options">{gyms.data?.pages.flatMap(page => page.data).map(gym => <button key={gym.gym_id} type="button" className="admin-gym-picker-option" aria-pressed={gym.gym_id === value} onClick={() => {
        setChosen({ id: gym.gym_id, label: gym.gym_name }); change(gym.gym_id); close();
      }}>{gym.gym_name}{gym.status === 'INACTIVE' && <small>Ngừng hoạt động</small>}</button>)}</div>}
      {gyms.data && !gyms.isError && !gyms.data.pages[0].pagination.totalItems && <p>Không tìm thấy phòng Gym phù hợp.</p>}
      {gyms.hasNextPage && <button type="button" className="btn-secondary" disabled={gyms.isFetchingNextPage} onClick={() => void gyms.fetchNextPage()}>{gyms.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm Gym'}</button>}
    </div>}
  </div>;
};
