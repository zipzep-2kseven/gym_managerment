import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useGym } from '../../hooks/useGym';
import { QueryState } from '../../components/gym/GymUi';
import { GymForm } from '../../components/gym/GymForm';
export const useManagerGymId = () => useAuth().user?.active_gym_assignments.find(item => item.assignment_type === 'MANAGER')?.gym_id || '';
export const ManagerGymPage = () => {
  const id = useManagerGymId();
  const gym = useGym(id);
  return <><h1>Quản lý thông tin Gym</h1><nav className="gym-actions"><Link to="/manager/trainers">Quản lý PT</Link></nav><QueryState pending={gym.isPending} error={gym.error} retry={gym.refetch} />{gym.data && !gym.isError && <GymForm key={gym.data.gym_id} gym={gym.data} />}</>;
};
