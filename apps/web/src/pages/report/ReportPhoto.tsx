import { useState } from 'react';
import { reportService } from '../../services/report.service';

export const ReportPhoto = ({ id }: { id: string }) => {
  const [failed, setFailed] = useState(false);
  return failed ? <p role="status">Không tải được ảnh. Hãy làm mới trang hoặc kiểm tra phiên đăng nhập.</p> : <img crossOrigin="use-credentials" className="report-photo" src={reportService.image(id)} alt="Ảnh do người gửi cung cấp" loading="lazy" onError={() => setFailed(true)} />;
};
