import { useState } from 'react';
import { useGymMutation } from '../../hooks/useGym';
import { gymService } from '../../services/gym.service';
import type { Gym, GymInput } from '../../types/gym.types';
import { MutationError } from './GymUi';
import { GymFields, gymFields as fields } from './GymFields';
import { CreateGymWithManagerForm } from './CreateGymWithManagerForm';
const EditGymForm = ({ gym: currentGym, onSaved }: { gym: Gym; onSaved?: () => void }) => {
  // Keep the editing snapshot stable across background refetches. Only changed
  // fields are patched, so remote edits to other fields are preserved.
  const [gym] = useState(currentGym);
  const [baseline, setBaseline] = useState<Partial<GymInput>>(currentGym);
  const [saved, setSaved] = useState(false);
  const mutation = useGymMutation((body: Partial<GymInput>) => gymService.update(gym.gym_id, body));
  return <form className="gym-panel" onChange={() => setSaved(false)} onSubmit={event => {
    event.preventDefault();
    if (mutation.isPending) return;
    const form = new FormData(event.currentTarget);
    const input = Object.fromEntries([...fields.map(([name]) => [name, String(form.get(name) || '').trim() || null]), ['description', String(form.get('description') || '') || null]]) as unknown as GymInput;
    const body = Object.fromEntries(Object.entries(input).filter(([key, value]) => {
      const old = baseline[key as keyof GymInput];
      return key.endsWith('_time') ? (old?.slice(0, 5) || null) !== value : old !== value;
    }));
    if (!Object.keys(body).length) { setSaved(true); return; }
    mutation.mutate(body, { onSuccess: () => { setBaseline(input); setSaved(true); onSaved?.(); } });
  }}><h2>Thông tin phòng Gym</h2><MutationError error={mutation.error} />{saved && <p className="alert-banner alert-success" role="status">Thông tin đã được lưu.</p>}
    <fieldset disabled={mutation.isPending} className="gym-fieldset"><GymFields gym={gym} /><button className="btn-primary" type="submit">{mutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}</button></fieldset>
  </form>;
};

export const GymForm = (props: { gym?: Gym; onSaved?: () => void }) => props.gym ? <EditGymForm gym={props.gym} onSaved={props.onSaved} /> : <CreateGymWithManagerForm />;
