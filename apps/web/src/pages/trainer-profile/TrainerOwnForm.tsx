import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TrainerProfileError } from './TrainerProfileError';
import { useAuth } from '../../hooks/useAuth';
import { ApiClientError } from '../../services/api-client';
import { platforms, trainerProfileService, type TrainerProfile, type TrainerLink } from '../../services/trainer-profile.service';
export const TrainerOwnForm = ({ row, done }: { row: TrainerProfile; done: () => Promise<void> }) => {
  const { refreshSession } = useAuth();
  const [bio, setBio] = useState(row.bio || ''), [links, setLinks] = useState<TrainerLink[]>(row.social_links);
  const mutation = useMutation({ mutationFn: () => trainerProfileService.saveMine(row, bio, links.map(r => ({ ...r, url: r.url.trim() }))), onSuccess: done, retry: false, onError: async error => { if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) await refreshSession(); } });
  return <form className="gym-panel" onSubmit={e => { e.preventDefault(); if (!mutation.isPending) mutation.mutate(); }}><fieldset className="gym-fieldset" disabled={mutation.isPending}>
    <legend>Hồ sơ giới thiệu</legend>
    <label className="form-group">Giới thiệu ngắn<textarea className="form-textarea" maxLength={2000} value={bio} onChange={e => setBio(e.target.value)} /></label>
    <section><h2>Liên kết của tôi</h2><p>Không bắt buộc. Mỗi nền tảng một liên kết.</p>{links.map((link, index) => <div className="gym-toolbar" key={index}>
      <label className="form-group">Nền tảng<select className="form-input" aria-label={`Nền tảng ${index + 1}`} value={link.platform} onChange={e => setLinks(links.map((r, i) => i === index ? { ...r, platform: e.target.value } : r))}>{platforms.map(platform => <option key={platform} value={platform}>{platform}</option>)}</select></label>
      <label className="form-group">Đường dẫn<input className="form-input" aria-label={`Đường dẫn ${index + 1}`} type="url" required maxLength={2048} value={link.url} onChange={e => setLinks(links.map((r, i) => i === index ? { ...r, url: e.target.value } : r))} /></label>
      <button className="btn-secondary" type="button" onClick={() => setLinks(links.filter((_, i) => i !== index))}>Bỏ liên kết {index + 1}</button>
    </div>)}<button className="btn-secondary" type="button" disabled={links.length >= 5} onClick={() => setLinks([...links, { platform: platforms.find(p => !links.some(r => r.platform === p)) || 'WEBSITE', url: '' }])}>Thêm liên kết</button></section>
    <button className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? 'Đang lưu…' : 'Lưu hồ sơ giới thiệu'}</button>
  </fieldset><TrainerProfileError error={mutation.error} /></form>;
};
