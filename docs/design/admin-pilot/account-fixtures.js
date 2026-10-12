/* Dữ liệu hư cấu; không có kết nối tới API hoặc database. */
window.AdminPilotFixtures = (() => {
  const statusLabels = { ACTIVE:'Hoạt động', SUSPENDED:'Khóa tạm', INACTIVE:'Ngừng hoạt động' };
  const roleLabels = { ADMIN:'Admin', MANAGER:'Manager', PT:'PT', CUSTOMER:'Customer' };
  const makeAccount = (index, value) => ({
    user_id:`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`,
    email:`member${index}@example.test`, phone:null, status:'ACTIVE', must_change_password:false,
    created_at:'2026-10-01T00:00:00.000Z', updated_at:'2026-10-01T00:00:00.000Z',
    profile:{ full_name:`Hội viên mẫu ${index}` }, roles:['CUSTOMER'], active_gym_assignments:[], ...value,
  });
  const defaults = () => [
    makeAccount(1,{email:'manager.sample@example.test',phone:'0900 000 001',profile:{full_name:'Người dùng mẫu'},roles:['MANAGER'],active_gym_assignments:[{assignment_type:'MANAGER',gym_name:'Gym Mẫu A'}]}),
    makeAccount(2,{email:'tai.khoan.pt.chua.co.ho.so.va.email.dai.de.kiem.tra.hien.thi@example.test',profile:null,roles:['PT'],status:'SUSPENDED',must_change_password:true,active_gym_assignments:[{assignment_type:'PT',gym_name:'Gym Mẫu A'}]}),
    makeAccount(3,{email:'admin.sample@example.test',profile:{full_name:'Admin mẫu'},roles:['ADMIN','CUSTOMER']}),
  ];
  const paging = () => [...Array.from({length:20},(_,i)=>makeAccount(i+10,{})),defaults()[0]];
  return { statusLabels, roleLabels, defaults, paging };
})();
