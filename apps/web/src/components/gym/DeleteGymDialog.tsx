import { useEffect, useRef } from 'react';
import type { Gym } from '../../types/gym.types';
import { MutationError } from './GymUi';

export const DeleteGymDialog = ({ gym, pending, error, onClose, onDelete }: {
  gym: Gym; pending: boolean; error: Error | null; onClose: () => void; onDelete: () => void;
}) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallback = opener?.closest('.admin-gyms-page')?.querySelector('h1');
    const modal = dialog.current;
    modal?.showModal(); cancel.current?.focus();
    return () => {
      modal?.close();
      if (opener?.isConnected) opener.focus();
      else if (fallback instanceof HTMLElement) { fallback.tabIndex = -1; fallback.focus(); }
    };
  }, []);
  return <dialog ref={dialog} className="admin-gym-delete-dialog" aria-labelledby="delete-gym-title"
    onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
    <h2 id="delete-gym-title">Xóa phòng Gym?</h2>
    <p>Bạn sắp xóa <strong>{gym.gym_name}</strong>. Thao tác này không thể hoàn tác.</p>
    <p>Chỉ xóa được khi không có dữ liệu liên kết hoặc lịch sử phân công. Với Gym đã phát sinh dữ liệu, hãy chọn ngừng hoạt động trong phần chỉnh sửa.</p>
    <MutationError error={error} />
    <div className="gym-actions"><button ref={cancel} className="btn-secondary" disabled={pending} onClick={onClose}>Hủy</button>
      <button className="btn-primary admin-delete-button" disabled={pending} onClick={onDelete}>{pending ? 'Đang xóa…' : 'Xác nhận xóa'}</button>
    </div>
  </dialog>;
};
