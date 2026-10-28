import {test,expect,type Page} from '@playwright/test';
const api='http://127.0.0.1:4103/api/v1';
const login=async(page:Page,role:string)=>{page.on('pageerror',error=>console.log('Browser error:',error.message));await page.goto('/login');await page.locator('input[name="email"]').fill(`${role}@gym03.test`);await page.locator('input[name="password"]').fill('BrowserFixture@123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('link',{name:`Browser ${role.toUpperCase()}`,exact:true})).toBeVisible();};
test('Admin finds accounts, protects Admin, confirms suspend/unlock; existing Customer session follows DB status',async({page,browser})=>{
 const customerContext=await browser.newContext(),customer=await customerContext.newPage();
 try{
  await login(customer,'customer');expect((await customer.request.get(`${api}/admin/users`)).status()).toBe(403);await customer.goto('/admin/users');await expect(customer.getByRole('heading',{name:'Quản lý tài khoản',exact:true})).toHaveCount(0);
  await login(page,'admin');await page.getByRole('link',{name:'Quản lý tài khoản',exact:true}).click();await expect(page.getByText('4 tài khoản phù hợp',{exact:true})).toBeVisible();
  const admin=page.getByRole('row').filter({hasText:'Browser ADMIN'});
  await expect(admin.getByLabel('Tài khoản Admin được bảo vệ',{exact:true})).toBeVisible();
  await expect(admin.getByRole('button',{name:'Khóa tạm tài khoản',exact:true})).toHaveCount(0);
  await page.getByLabel('Vai trò tài khoản').selectOption('MANAGER');await expect(page.getByText('1 tài khoản phù hợp',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Xem tài khoản manager@gym03.test',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Browser Gym');await page.keyboard.press('Escape');
  await page.getByLabel('Vai trò tài khoản').selectOption('');await page.getByLabel('Tìm tên hoặc email').fill('CUSTOMER@gym03.test');await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);await expect(page.getByRole('table')).toContainText('Browser CUSTOMER');
  await page.getByRole('button',{name:'Khóa tạm tài khoản',exact:true}).click();await expect(page.getByText('Thẻ hội viên, lịch tập và phân công hiện có vẫn được giữ.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Hủy thao tác',exact:true}).click();expect((await customer.request.get(`${api}/auth/me`)).status()).toBe(200);
  await page.getByRole('button',{name:'Khóa tạm tài khoản',exact:true}).click();await page.getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã cập nhật trạng thái');await expect(page.getByRole('button',{name:'Mở lại tài khoản',exact:true})).toBeVisible();expect((await customer.request.get(`${api}/auth/me`)).status()).toBe(403);
  expect((await customer.request.post(`${api}/auth/login`,{data:{email:'customer@gym03.test',password:'BrowserFixture@123'}})).status()).toBe(403);
  await page.getByLabel('Trạng thái tài khoản').selectOption('SUSPENDED');await expect(page.getByText('1 tài khoản phù hợp',{exact:true})).toBeVisible();
  for(const width of [375,768,1024,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}await page.screenshot({path:'/tmp/admin-users.png',fullPage:true});
  await page.getByRole('button',{name:'Mở lại tài khoản',exact:true}).click();await page.getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(page.getByText('Không có tài khoản phù hợp.',{exact:true})).toBeVisible();expect((await customer.request.get(`${api}/auth/me`)).status()).toBe(200);
  await page.getByLabel('Trạng thái tài khoản').selectOption('');await page.getByLabel('Tìm tên hoặc email').fill('khong-ton-tai');await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await expect(page.getByText('Không có tài khoản phù hợp.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
 }finally{await customerContext.close();}
});
test('Paging, pending prevents repeat writes, stale version requires reload before new confirmation',async({page})=>{
 let writes=0,updated=false,release=()=>{};const gate=new Promise<void>(r=>{release=r;});
 const row={user_id:'10000000-0000-4000-8000-000000000001',email:'long'+ 'x'.repeat(150)+'@test.local',phone:null,status:'ACTIVE',must_change_password:false,email_verified_at:null,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-10-10T00:00:00Z',profile:{full_name:'Hội viên kiểm thử',avatar_url:null},roles:['CUSTOMER'],active_gym_assignments:[]};
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());if(url.pathname.endsWith('/auth/me'))return route.fulfill({json:{success:true,data:{user_id:'admin',roles:['ADMIN'],status:'ACTIVE',must_change_password:false,active_gym_assignments:[]}}});
  if(route.request().method()==='PATCH'){writes++;expect(route.request().postDataJSON()).toEqual({status:'SUSPENDED',expected_updated_at:row.updated_at});await gate;return route.fulfill({status:409,json:{success:false,error:{code:'USER_CHANGED',message:'Tài khoản đã thay đổi. Hãy tải lại trước khi thao tác.'}}});}
  return route.fulfill({json:{success:true,data:{items:[updated?{...row,status:'SUSPENDED',updated_at:'2026-10-10T01:00:00Z'}:row],total:21,page:Number(url.searchParams.get('page')||1),page_size:20}}});
 });
 await page.goto('/admin/users');await expect(page.getByText('Trang 1 / 2',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page.getByText('Trang 2 / 2',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Trang sau',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Khóa tạm tài khoản',exact:true}).click();await page.getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(page.getByRole('button',{name:'Đang lưu…',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Hủy thao tác',exact:true})).toBeDisabled();expect(writes).toBe(1);release();await expect(page.getByRole('alert')).toContainText('Tài khoản đã thay đổi');await expect(page.getByRole('button',{name:'Xác nhận',exact:true})).toBeDisabled();
 for(const width of [375,768,1024,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}await page.screenshot({path:'/tmp/admin-users-conflict.png',fullPage:true});
 updated=true;await page.getByRole('button',{name:'Tải lại danh sách',exact:true}).click();await expect(page.getByRole('button',{name:'Mở lại tài khoản',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Xác nhận',exact:true})).toHaveCount(0);expect(writes).toBe(1);
});
test('Auth regression: new Customer registers, edits profile and changes password on isolated fixture',async({page})=>{
 const email=`auth.regression.${Date.now()}@gym03.test`,password='AuthFixture@12345',next='AuthFixtureNext@12345';
 await page.goto('/register');await page.locator('input[name="full_name"]').fill('Auth Regression');await page.locator('input[name="email"]').fill(email);await page.locator('input[name="password"]').fill(password);await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByRole('link',{name:'Auth Regression',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Auth Regression',exact:true}).click();await page.locator('input[name="full_name"]').fill('Auth Regression Updated');await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await expect(page.getByRole('alert')).toContainText('thành công');
 await page.goto('/change-password');await page.locator('input[name="current_password"]').fill(password);await page.locator('input[name="new_password"]').fill(next);await page.locator('input[name="confirm_password"]').fill(next);await page.getByRole('button',{name:'Cập nhật mật khẩu',exact:true}).click();await expect(page.getByTestId('change-password-success-alert')).toBeVisible();
 await page.goto('/gyms');await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.goto('/login');await page.locator('input[name="email"]').fill(email);await page.locator('input[name="password"]').fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Email hoặc mật khẩu không chính xác');
 await page.locator('input[name="password"]').fill(next);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('link',{name:'Auth Regression Updated',exact:true})).toBeVisible();expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
});

test('Real Admin session opens every Gym inspection tab without operational controls', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/admin/gyms');
  const view = page.getByRole('link', { name: 'Xem Browser Gym', exact: true });
  await expect(view).toBeVisible(); await view.click();
  const current = page.url();
  for (const [tab, resources] of [
    ['staff', ['trainers', 'schedules', 'social']], ['members', ['packages', 'memberships', 'payments', 'consultations']],
    ['pt', ['appointments', 'registrations']], ['facilities', ['equipment', 'images']], ['reports', ['reports']], ['reviews', ['gym-reviews', 'trainer-reviews']],
  ] as const) {
    for (const resource of resources) {
      await page.goto(`${current}/${tab}?view=${resource}`);
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
    }
  }
  await page.screenshot({ path: '../../docs/design/admin-workspace/previews/table-live-gym-details.png', fullPage: true });
});
