import { useEffect, useRef, useId, type ReactNode } from 'react';
export const AdminDialog = ({ title, onClose, children, drawer = false, busy = false }: {
  title: string; onClose: () => void; children: ReactNode; drawer?: boolean; busy?: boolean;
}) => {
  const ref = useRef<HTMLDialogElement>(null), close = useRef<HTMLButtonElement>(null), titleId = useId();
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallback = opener?.closest('main')?.querySelector('h1');
    const modal = ref.current; modal?.showModal(); close.current?.focus();
    return () => {
      modal?.close();
      if (opener?.isConnected && !(opener instanceof HTMLButtonElement && opener.disabled)) opener.focus();
      else if (fallback instanceof HTMLElement) { fallback.tabIndex = -1; fallback.focus(); }
    };
  }, []);
  return <dialog ref={ref} className={`admin-dialog${drawer ? ' is-drawer' : ''}`} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="admin-dialog-heading"><h2 id={titleId}>{title}</h2>
      <button ref={close} type="button" className="btn-secondary" disabled={busy} aria-label="Đóng chi tiết" onClick={onClose}>Đóng</button></div>
    {children}
  </dialog>;
};
