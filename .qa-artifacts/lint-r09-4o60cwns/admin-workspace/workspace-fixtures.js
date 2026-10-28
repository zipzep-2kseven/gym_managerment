// Chỉ dữ liệu hư cấu, không có API hoặc persistence.
window.AdminWorkspaceFixtures = (() => {
  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const roles = [
    {role_name:'ADMIN',description:'Quản trị toàn hệ thống trong phạm vi quyền hiện hành.'},
    {role_name:'MANAGER',description:'Quản lý cơ sở có phân công đang hoạt động.'},
    {role_name:'PT',description:'Huấn luyện viên cá nhân.'},
    {role_name:'CUSTOMER',description:null},
  ];
  const gym = (n,status='ACTIVE') => ({gym_id:id(n),gym_name:`Gym Mẫu ${n===1?'A':n===2?'B':n}`,status,
    address:`${n} Đường Mẫu, Khu vực minh họa`,phone:null,email:null,description:null,logo_url:null,
    latitude:null,longitude:null,opening_time:'06:00:00',closing_time:'22:00:00'});
  const seed = paging => ({gyms:paging?Array.from({length:23},(_,i)=>gym(i+1)):[gym(1),gym(2,'INACTIVE'),gym(3)],
    managers:[{gym_manager_id:id(101),gym_id:id(1),user_id:id(201),status:'ACTIVE',assigned_at:'2026-10-01T08:00:00Z'},
      {gym_manager_id:id(102),gym_id:id(1),user_id:id(202),status:'INACTIVE',assigned_at:'2026-09-01T08:00:00Z'}],
    users:[{user_id:id(201),status:'ACTIVE',role:'MANAGER',gym_id:id(1)},
      {user_id:id(202),status:'ACTIVE',role:'MANAGER',gym_id:null},
      {user_id:id(203),status:'SUSPENDED',role:'MANAGER',gym_id:null}]});
  return {id,roles,seed,password:'[MẬT KHẨU TẠM MẪU]'};
})();
