import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';
import { mkdir,writeFile } from 'node:fs/promises';

const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
const page=await context.newPage();
const failures=[],checks=[],errors=[],apiRequests=[];
const url=new URL('index.html',import.meta.url).href;
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(/\/api\//.test(request.url()))apiRequests.push(request.url());});
const select=async value=>{await page.locator('#scenario').selectOption(value);};
const row=index=>page.locator('.account-row').nth(index);
const open=async index=>{await row(index).getByRole('button',{name:/Khóa tạm tài khoản|Mở lại tài khoản/}).click();};
const save=async()=>{await page.getByRole('button',{name:/Xác nhận khóa|Xác nhận mở lại/}).click();};
const ready=async()=>{await page.waitForFunction(()=>!document.querySelector('.account-confirm')&&!document.querySelector('#reload').disabled);};
const check=async(name,run)=>{try{await run();checks.push(name);}catch(error){failures.push({name,message:error.message});}};

try {
  await page.goto(url);
  for(const width of [375,768,1024,1440])await check('Reflow '+width,async()=>{
    await page.setViewportSize({width,height:900});
    assert.equal(await page.locator('.account-row').count(),3);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const clipped=await page.locator('.account-row p').evaluateAll(nodes=>nodes.some(n=>n.scrollWidth>n.clientWidth+1));assert.equal(clipped,false);
  });
  await page.setViewportSize({width:1440,height:1000});
  await check('Search submit và select không áp dụng draft chưa submit',async()=>{
    await page.locator('#search').fill('khong-co-ket-qua');assert.equal(await page.locator('.account-row').count(),3);
    await page.locator('#role').selectOption('MANAGER');assert.equal(await page.locator('.account-row').count(),1);
    await page.locator('#role').selectOption('');assert.equal(await page.locator('.account-row').count(),3);
    await page.locator('#search').fill('manager.sample');await page.locator('#search').press('Enter');assert.equal(await page.locator('.account-row').count(),1);
  });
  await select('default');
  await check('Admin được bảo vệ; hủy trả focus đúng target',async()=>{
    assert.equal(await row(2).getByRole('button').count(),0);await open(0);
    assert.ok(await page.locator('.account-confirm').getByText(/Thẻ hội viên, lịch tập và phân công/).isVisible());
    await page.getByRole('button',{name:'Hủy thao tác'}).click();
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.action),'open');
  });
  await check('Khóa thành công, pending chặn ghi/hủy và giữ phân công',async()=>{
    await open(0);await save();assert.ok(await page.getByRole('button',{name:'Đang lưu…',exact:true}).isDisabled());
    assert.equal(await page.evaluate(()=>document.activeElement?.tagName),'H3');
    assert.ok(await page.getByRole('button',{name:'Hủy thao tác'}).isDisabled());await ready();
    assert.ok(await row(0).getByText('Khóa tạm',{exact:true}).isVisible());assert.ok(await row(0).getByText('Quản lý · Gym Mẫu A').isVisible());
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.action),'open');
  });
  await check('Mở lại giữ yêu cầu đổi mật khẩu',async()=>{
    await open(1);await save();await ready();assert.ok(await row(1).getByText('Hoạt động',{exact:true}).isVisible());assert.ok(await row(1).getByText('Cần đổi mật khẩu tạm.').isVisible());
  });
  for(const scenario of ['conflict','unknown','validation','gone','protected'])await check('Recovery '+scenario,async()=>{
    await select(scenario);await open(0);await save();await page.locator('.account-confirm [role=alert]').waitFor();
    assert.ok(await page.getByRole('button',{name:'Xác nhận khóa'}).isDisabled());
    await page.getByRole('button',{name:'Hủy thao tác'}).click();assert.ok(await row(0).getByRole('button',{name:'Khóa tạm tài khoản'}).isDisabled());
    await page.getByRole('button',{name:'Tải lại danh sách',exact:true}).click();await ready();
    if(scenario==='gone')assert.equal(await page.locator('.account-row').count(),2);
    if(scenario==='protected')assert.equal(await row(0).getByRole('button').count(),0);
    if(['conflict','unknown'].includes(scenario))assert.ok(await row(0).getByText('Khóa tạm',{exact:true}).isVisible());
  });
  await check('Trang cuối tự clamp sau khóa khi đang lọc ACTIVE',async()=>{
    await select('paging');assert.ok(await page.getByText('Trang 2 / 2',{exact:true}).isVisible());await open(0);await save();await ready();
    assert.equal(await page.locator('.account-row').count(),20);assert.ok(await page.getByText('Đã chuyển về trang 1',{exact:true}).isVisible());assert.equal(await page.locator('#status').inputValue(),'ACTIVE');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'reload');
  });
  await check('Lưu thành công và lỗi đọc không giả rollback',async()=>{
    await select('save-read-error');await open(0);await save();await page.getByText('Thao tác đã được lưu; danh sách chưa tải lại được.').waitFor();assert.equal(await page.locator('.account-row').count(),0);
    await page.getByRole('button',{name:'Thử tải lại'}).click();await ready();assert.ok(await row(0).getByText('Khóa tạm',{exact:true}).isVisible());
  });
  await check('INACTIVE/null roles/phone/profile và mở lại',async()=>{
    await select('inactive');assert.ok(await row(1).getByText('Ngừng hoạt động',{exact:true}).isVisible());assert.ok(await row(1).getByText('Chưa có vai trò').isVisible());await open(1);await save();await ready();assert.ok(await row(1).getByText('Hoạt động',{exact:true}).isVisible());
  });
  await check('Empty/loading/read error/mất quyền',async()=>{
    for(const state of ['empty','loading','get-error','permission']){await select(state);assert.equal(await page.locator('.account-row').count(),0);}
    assert.equal(await page.locator('#filters').isVisible(),false);assert.equal(await page.locator('.sidebar').isVisible(),false);
    assert.equal(await page.getByText('manager.sample@example.test',{exact:true}).count(),0);
  });
  await select('default');await page.setViewportSize({width:375,height:812});
  await check('Drawer focus trap/Escape/return focus và resize',async()=>{
    await page.getByRole('button',{name:'Menu',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'close-menu');
    await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('#sidebar')!==null));
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'open-menu');
    await page.getByRole('button',{name:'Menu',exact:true}).click();await page.setViewportSize({width:1024,height:900});await page.waitForFunction(()=>!document.querySelector('.menu-open'));assert.equal(await page.locator('.menu-open').count(),0);
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'reload');
  });
  for(const state of ['default','conflict','permission','drawer'])await check('Axe '+state,async()=>{
    await select(state==='drawer'?'default':state);if(state==='conflict'){await open(0);await save();await page.locator('[role=alert]').waitFor();}
    if(state==='drawer'){await page.setViewportSize({width:375,height:812});await page.getByRole('button',{name:'Menu',exact:true}).click();}
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.length})),[]);
  });
  await check('Nút Đóng menu có chữ đọc được và Tab vào skip link',async()=>{
    const colors=await page.locator('#close-menu').evaluate(n=>({foreground:getComputedStyle(n).color,background:getComputedStyle(n).backgroundColor}));assert.notEqual(colors.foreground,colors.background);
    await page.keyboard.press('Escape');await page.goto(url);await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'skip-link');
  });
  await check('Không có lỗi JavaScript hoặc gọi API',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(apiRequests,[]);});
  if(failures.length===0){
    const folder=fileURLToPath(new URL('previews/',import.meta.url));await mkdir(folder,{recursive:true});await select('default');
    for(const [width,name]of [[1440,'desktop'],[375,'mobile']]){await page.setViewportSize({width,height:1000});await page.screenshot({path:folder+'/'+name+'.png',fullPage:true});}
    await open(0);await page.screenshot({path:folder+'/confirmation-mobile.png',fullPage:true});
    await page.getByRole('button',{name:'Hủy thao tác'}).click();await page.setViewportSize({width:375,height:812});await page.getByRole('button',{name:'Menu',exact:true}).click();await page.screenshot({path:folder+'/drawer-mobile.png',fullPage:false});
  }
} finally {
  await browser.close();
  const report={checkedAt:new Date().toISOString(),scope:'Prototype HTML SCR-ADM-002, không phải production',checks,failures,jsErrors:errors,apiRequests};
  await writeFile(new URL('verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:checks.length,failures},null,2));
  if(failures.length)process.exitCode=1;
}
