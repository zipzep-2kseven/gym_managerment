import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { packageTestHarness } from './package-test-fixture.js';
import { createAdminUserService } from '../src/services/admin-user.service.js';
import { createAdminUserRouter } from '../src/routes/admin-user.routes.js';
import { AuthService } from '../src/services/auth.service.js';
import { UserService } from '../src/services/user.service.js';
import { createPtWorkflowService } from '../src/services/pt-workflow.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { signJwt } from '../src/utils/jwt.js';
import { config } from '../src/config/index.js';
import { users, userProfiles, userRoles, roles, memberships, gymTrainers, ptRegistrations, ptAppointments } from '../src/database/schema/index.js';
const h = await packageTestHarness(), events: Record<string,string>[] = [], service = createAdminUserService(h.database,e => events.push(e));
const auth = new AuthService(h.database), profile = new UserService(h.database);
const app = express(); app.use(express.json(),cookieParser()); app.use('/api/v1',createAdminUserRouter(service)); app.use(errorHandler);
const server = app.listen(0,'127.0.0.1'); await once(server,'listening'); const port = (server.address() as {port:number}).port;
interface UserRow {user_id:string; email:string; status:string; updated_at:string; must_change_password:boolean; roles:string[]; active_gym_assignments:{gym_id:string; assignment_type:string}[]}
const request = async (method:string,path:string,actor:string|null,body?:unknown) => {
 const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`,{method,headers:{'Content-Type':'application/json',...(actor?{Cookie:`${config.cookie.name}=${signJwt({sub:actor,email:'claim@test.local',roles:['ADMIN']})}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,headers:response.headers,body:await response.json() as {data:UserRow & {items:UserRow[];total:number};error:{code:string}}};
};
const patch = (id:string) => `/admin/users/${id}/status`;
const version = async (id:string) => (await h.database.select().from(users).where(eq(users.userId,id)))[0].updatedAt.toISOString();
let checks=0; const run=async(name:string,fn:()=>Promise<void>)=>{await fn();checks++;console.log(`PASS admin users: ${name}`);};
try {
 const f=await h.fixture(), customer=await h.user('CUSTOMER'), pt=await h.user('PT'), otherAdmin=await h.user('ADMIN');
 await h.database.insert(userProfiles).values([{userId:customer,fullName:'Literal%_\\ Customer'},{userId:f.manager,fullName:'Manager Test'},{userId:pt,fullName:'Trainer Test'}]);
 const [trainer]=await h.database.insert(gymTrainers).values({gymId:f.gymA.gymId,userId:pt}).returning();
 const [member]=await h.database.insert(memberships).values({userId:customer,gymId:f.gymA.gymId,packageId:f.packages[0].packageId,status:'ACTIVE',startDate:'2020-01-01',endDate:'2099-01-01',purchasePrice:'10.00'}).returning();
 const [reg]=await h.database.insert(ptRegistrations).values({membershipId:member.membershipId,gymTrainerId:trainer.gymTrainerId,status:'ACTIVE'}).returning();
 const [appointment]=await h.database.insert(ptAppointments).values({registrationId:reg.registrationId,startTime:new Date('2090-01-01T01:00:00Z'),endTime:new Date('2090-01-01T02:00:00Z'),status:'PENDING'}).returning();
 await run('DB-current Admin only, Guest/Customer/Manager/PT denied despite forged claims',async()=>{
  assert.equal((await request('GET','/admin/users',null)).status,401);
  for(const actor of [customer,f.manager,pt])for(const path of ['/admin/users','/admin/roles'])assert.equal((await request('GET',path,actor)).status,403);
  for(const actor of [customer,f.manager,pt])assert.equal((await request('PATCH',patch(customer),actor,{status:'SUSPENDED',expected_updated_at:await version(customer)})).status,403);
 });
 await run('Safe projection, literal search, role/status paging, readonly role catalog',async()=>{
  const all=await request('GET','/admin/users?pageSize=2',f.admin);assert.equal(all.status,200);assert.equal(all.body.data.total,5);assert.equal(all.body.data.items.length,2);assert.equal(all.headers.get('cache-control'),'no-store');
  assert.ok(!/password_hash|private_hash|temporary_password|date_of_birth|address|token|cookie/.test(JSON.stringify(all.body)));
  const literal=await request('GET',`/admin/users?search=${encodeURIComponent('%_\\')}`,f.admin);assert.equal(literal.body.data.total,1);assert.equal(literal.body.data.items[0].user_id,customer);
  assert.equal((await request('GET','/admin/users?search=literal&role=CUSTOMER&status=ACTIVE',f.admin)).body.data.total,1);
  const managers=await request('GET','/admin/users?role=MANAGER',f.admin);assert.deepEqual(managers.body.data.items[0].active_gym_assignments,[{gym_id:f.gymA.gymId,gym_name:f.gymA.gymName,assignment_type:'MANAGER'}]);
  const catalog=await request('GET','/admin/roles',f.admin);assert.equal(catalog.status,200);assert.equal((catalog.body.data as unknown as unknown[]).length,4);
  const email=(await h.database.select().from(users).where(eq(users.userId,pt)))[0].email;assert.equal((await request('GET',`/admin/users?search=${encodeURIComponent(email.toUpperCase())}`,f.admin)).body.data.total,1);
 });
 await run('Strict query/body/params, all Admin accounts protected, missing and stale targets',async()=>{
  for(const q of ['page=0','pageSize=51','role=GUEST','status=HIDDEN','gym_id=x','search='+ 'x'.repeat(101)])assert.equal((await request('GET',`/admin/users?${q}`,f.admin)).status,400);
  for(const body of [{status:'SUSPENDED'},{status:'LOCKED',expected_updated_at:await version(customer)},{status:'SUSPENDED',expected_updated_at:await version(customer),roles:['ADMIN']}])assert.equal((await request('PATCH',patch(customer),f.admin,body)).status,400);
  assert.equal((await request('PATCH',patch('invalid'),f.admin,{})).status,400);
  assert.equal((await request('PATCH',patch(randomUUID()),f.admin,{status:'SUSPENDED',expected_updated_at:await version(customer)})).status,404);
  for(const id of [f.admin,otherAdmin])assert.equal((await request('PATCH',patch(id),f.admin,{status:'SUSPENDED',expected_updated_at:await version(id)})).body.error.code,'ADMIN_ACCOUNT_PROTECTED');
  assert.equal((await request('PATCH',patch(customer),f.admin,{status:'SUSPENDED',expected_updated_at:'2020-01-01T00:00:00.000Z'})).body.error.code,'USER_CHANGED');assert.equal(events.length,0);
  assert.equal((await request('PATCH',patch(customer),f.admin,{status:'ACTIVE',expected_updated_at:(await version(customer)).replace('Z','+00:00')})).body.error.code,'INVALID_STATUS_TRANSITION');
 });
 const duties=async()=> (await h.pool.query("select jsonb_build_object('memberships',(select jsonb_agg(m) from memberships m),'registrations',(select jsonb_agg(r) from pt_registrations r),'appointments',(select jsonb_agg(a) from pt_appointments a),'managers',(select jsonb_agg(m) from gym_managers m),'trainers',(select jsonb_agg(t) from gym_trainers t),'payments',(select jsonb_agg(p) from payments p),'roles',(select jsonb_agg(u order by user_id,role_id) from user_roles u)) data")).rows[0].data;
 await run('Concurrent CAS commits once, suspension blocks old session; no changes to open duties',async()=>{
  const before=await duties(), expected=await version(customer);
  const result=await Promise.all([request('PATCH',patch(customer),f.admin,{status:'SUSPENDED',expected_updated_at:expected}),request('PATCH',patch(customer),otherAdmin,{status:'SUSPENDED',expected_updated_at:expected})]);
  assert.deepEqual(result.map(r=>r.status).sort(),[200,409]);assert.deepEqual(await duties(),before);assert.equal(events.length,1);assert.ok(!/email|password|phone/.test(JSON.stringify(events)));
  await assert.rejects(auth.getCurrentUser(customer),{code:'ACCOUNT_DEACTIVATED'});await assert.rejects(profile.updateProfile(customer,{phone:undefined,full_name:'blocked'}),{code:'ACCOUNT_DEACTIVATED'});
  const opened=await request('PATCH',patch(customer),f.admin,{status:'ACTIVE',expected_updated_at:await version(customer)});assert.equal(opened.status,200);assert.equal((await auth.getCurrentUser(customer)).status,'ACTIVE');assert.deepEqual(await duties(),before);
 });
 await run('Manager/PT suspension retains assignments; internal actor can resolve open appointment',async()=>{
  const before=await duties();
  for(const id of [f.manager,pt])assert.equal((await request('PATCH',patch(id),f.admin,{status:'SUSPENDED',expected_updated_at:await version(id)})).status,200);
  assert.deepEqual(await duties(),before);for(const id of [f.manager,pt])await assert.rejects(auth.getCurrentUser(id),{code:'ACCOUNT_DEACTIVATED'});
  assert.equal((await request('PATCH',patch(f.manager),f.admin,{status:'ACTIVE',expected_updated_at:await version(f.manager)})).status,200);
  const cancelled=await createPtWorkflowService(h.database).appointmentAction(f.manager,f.gymA.gymId,appointment.appointmentId,'cancel',{note:'Admin xử lý lịch khi nhân sự tạm khóa'});assert.equal(cancelled.status,'CANCELLED');
  assert.equal((await request('PATCH',patch(pt),f.admin,{status:'ACTIVE',expected_updated_at:await version(pt)})).status,200);
 });
 await run('Revoked Admin role, suspended actor and password gate enforced from DB',async()=>{
  await h.database.update(users).set({mustChangePassword:true}).where(eq(users.userId,otherAdmin));assert.equal((await request('GET','/admin/users',otherAdmin)).status,403);
  await h.database.update(users).set({mustChangePassword:false,status:'SUSPENDED'}).where(eq(users.userId,otherAdmin));assert.equal((await request('GET','/admin/roles',otherAdmin)).status,403);
  await h.database.update(users).set({status:'ACTIVE'}).where(eq(users.userId,otherAdmin));await h.database.delete(userRoles).where(eq(userRoles.userId,otherAdmin));assert.equal((await request('GET','/admin/users',otherAdmin)).status,403);
  const [r]=await h.database.select().from(roles).where(eq(roles.roleName,'ADMIN'));await h.database.insert(userRoles).values({userId:otherAdmin,roleId:r.roleId});
  await h.database.update(users).set({mustChangePassword:true}).where(eq(users.userId,customer));
  for(const status of ['INACTIVE','ACTIVE'])assert.equal((await request('PATCH',patch(customer),f.admin,{status,expected_updated_at:await version(customer)})).status,200);
  assert.equal((await auth.getCurrentUser(customer)).must_change_password,true);
 });
 await run('Profile transaction waiting behind suspension rechecks status before either table writes',async()=>{
  // This race starts from an eligible account; the preceding case tests the password gate.
  await h.database.update(users).set({mustChangePassword:false}).where(eq(users.userId,customer));
  const before=(await h.pool.query('select to_jsonb(p) data from user_profiles p where user_id=$1',[customer])).rows;
  const holder=await h.pool.connect();await holder.query('begin');await holder.query('select user_id from users where user_id=$1 for update',[customer]);
  const pending=profile.updateProfile(customer,{phone:undefined,full_name:'must not commit'});const checked=assert.rejects(pending,{code:'ACCOUNT_DEACTIVATED'});
  try{await h.waitForBlocked(holder);await holder.query("update users set status='SUSPENDED' where user_id=$1",[customer]);await holder.query('commit');await checked;}finally{await holder.query('rollback');holder.release();}
  assert.deepEqual((await h.pool.query('select to_jsonb(p) data from user_profiles p where user_id=$1',[customer])).rows,before);
  await h.database.update(users).set({status:'ACTIVE'}).where(eq(users.userId,customer));assert.equal((await profile.updateProfile(customer,{phone:undefined,full_name:'Allowed profile'})).profile!.full_name,'Allowed profile');
 });
 await run('Password update waiting behind suspension cannot commit; login blocked, reopen preserves gate',async()=>{
  const password='Fixture@12345',newPassword='ChangedFixture@12345',encoded=await hash(password);await h.database.update(users).set({passwordHash:encoded,mustChangePassword:true}).where(eq(users.userId,customer));
  const holder=await h.pool.connect();await holder.query('begin');await holder.query('select user_id from users where user_id=$1 for update',[customer]);
  const checked=assert.rejects(auth.changePassword(customer,{current_password:password,new_password:newPassword}),{code:'ACCOUNT_DEACTIVATED'});
  try{await h.waitForBlocked(holder);await holder.query("update users set status='SUSPENDED' where user_id=$1",[customer]);await holder.query('commit');await checked;}finally{await holder.query('rollback');holder.release();}
  const [blocked]=await h.database.select().from(users).where(eq(users.userId,customer));assert.equal(blocked.passwordHash,encoded);assert.equal(blocked.mustChangePassword,true);
  await assert.rejects(auth.login({email:blocked.email,password}),{code:'ACCOUNT_DEACTIVATED'});
  assert.equal((await request('PATCH',patch(customer),f.admin,{status:'ACTIVE',expected_updated_at:await version(customer)})).status,200);
  await auth.changePassword(customer,{current_password:password,new_password:newPassword});const [changed]=await h.database.select().from(users).where(eq(users.userId,customer));assert.equal(changed.mustChangePassword,false);assert.ok(await verify(changed.passwordHash,newPassword));
  assert.equal((await auth.login({email:changed.email,password:newPassword})).session.status,'ACTIVE');
 });
 console.log(`PASS admin users: ${checks} groups`);
} finally {await new Promise<void>(r=>server.close(()=>r()));await h.close();}
