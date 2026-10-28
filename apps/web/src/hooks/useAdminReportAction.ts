import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { reportService, type IncidentReport } from '../services/report.service';
import { ApiClientError } from '../services/api-client';

type Action = 'investigate' | 'resolve' | 'reject';
export const useAdminReportAction = ({ row, read, onBusy, onDenied, onSaved }: {
  row: IncidentReport; read: () => Promise<boolean>; onBusy: (busy: boolean) => void; onDenied: (error: ApiClientError) => void; onSaved: (row: IncidentReport) => void;
}) => {
  const [action, setAction] = useState<Exclude<Action, 'investigate'> | null>(null);
  const [note, setNote] = useState('');
  const [needsRead, setNeedsRead] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const sending = useRef(false);
  const mutation = useMutation({ mutationFn: (kind: Action) => reportService.change(row, kind, kind === 'investigate' ? undefined : note.trim()), retry: false,
    onSuccess: async result => {
      onSaved(result);
      setReceipt(result.status); setNeedsRead(true); setAction(null); setNote('');
      if (await read()) setNeedsRead(false);
    },
    onError: error => {
      setReceipt(null);
      if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) onDenied(error);
      // A failed response may follow a committed write; read current state before another action.
      setNeedsRead(!(error instanceof ApiClientError && error.statusCode === 400));
    },
    onSettled: () => { sending.current = false; onBusy(false); },
  });
  const send = (kind: Action, blocked: boolean) => {
    if (blocked || sending.current || needsRead || reading || (kind !== 'investigate' && !note.trim())) return;
    sending.current = true; onBusy(true); setReceipt(null); mutation.mutate(kind);
  };
  const reconcile = async () => {
    if (reading || sending.current) return;
    setReading(true);
    try { if (await read()) { setNeedsRead(false); mutation.reset(); } }
    finally { setReading(false); }
  };
  return { action, setAction, note, setNote, needsRead, receipt, reading, mutation, send, reconcile };
};
