import type { Status } from './gym.types';
export interface GymPackage {
  package_id: string; gym_id: string; package_name: string; description: string | null;
  duration_days: number; price: string; status: Status; created_at: string; updated_at: string;
}
export type PackageInput = Pick<GymPackage, 'package_name' | 'description' | 'duration_days' | 'price'>;
