import type { UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

export type DashboardQuery = Pick<UseQueryResult, 'isPending' | 'isFetching' | 'isError' | 'dataUpdatedAt'>;

export const DashboardQueryFeedback = ({ query, retry, showTimestamp = true }: { query: DashboardQuery; retry: () => void; showTimestamp?: boolean }) => {
  const feedbackRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (query.isFetching || !restoreFocus.current) return;
    restoreFocus.current = false;
    // Retry replaces its button with loading feedback. Restore keyboard context
    // after the response, while respecting any deliberate move to another control.
    if (document.activeElement !== document.body) return;
    const target = query.isError ? retryRef.current
      : feedbackRef.current?.closest('article, section')?.querySelector<HTMLElement>('a[href], button:not([disabled])');
    if (target?.isConnected && !target.closest('[inert]') && target.getClientRects().length) target.focus();
  }, [query.isFetching, query.isError]);
  return <div ref={feedbackRef} className="admin-query-feedback" role="status" aria-live="polite">
    {query.isFetching ? <span>{query.isPending ? 'Đang tải dữ liệu…' : 'Đang làm mới…'}</span> : query.isError ? (
      <>
        <span>{query.dataUpdatedAt ? 'Làm mới thất bại. Dữ liệu cũ có thể đã thay đổi.' : 'Không thể tải dữ liệu.'}</span>
        <button ref={retryRef} type="button" className="btn-secondary" onClick={event => {
          restoreFocus.current = document.activeElement === event.currentTarget;
          retry();
        }}>Thử lại</button>
      </>
    ) : showTimestamp && query.dataUpdatedAt > 0 ? (
      <span>Nhận dữ liệu lúc <time dateTime={new Date(query.dataUpdatedAt).toISOString()}>
        {new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(query.dataUpdatedAt)}
      </time></span>
    ) : null}
  </div>;
};
