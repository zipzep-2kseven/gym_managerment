// QA-01 exercises the real app/router/controller/service stack in a disposable DB.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { securityPrivateRoutes } from './security-private-routes.js';
import pg from 'pg';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { hash } from '@node-rs/argon2';
import { config } from '../src/config/index.js';
const adminConnection = new pg.Client({ connectionString: process.env.DATABASE_URL });
await adminConnection.connect();
const name = `qa01_test_${randomUUID().replaceAll('-', '')}`;
await adminConnection.query(`CREATE DATABASE "${name}"`);
const url = new URL(process.env.DATABASE_URL!); url.pathname = `/${name}`;
process.env.DATABASE_URL = url.toString();
const images = await mkdtemp(join(tmpdir(), 'qa01-images-'));
process.env.REPORT_UPLOAD_DIR = images; process.env.GALLERY_UPLOAD_DIR = join(images, 'gallery');
const { db, pool, users, userRoles, roles, userProfiles, gyms, gymManagers, gymTrainers, packages } = await import('../src/database/index.js');
let server: import('node:http').Server | undefined, base = '', checks = 0;
const run = async (label: string, fn: () => Promise<void>) => { await fn(); checks++; console.log(`PASS QA-01: ${label}`); };
// Every real response must retain the public contract and private cache policy.
const request = async (method: string, path: string, cookie = '', body?: unknown, extra: Record<string, string> = {}) => {
  const response = await fetch(`${base}/api/v1${path}`, { method, headers: {
    Origin: config.cors.origin[0], 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra,
  }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json() as { success: boolean; data: any; error: { code: string; message: string } };
  assert.equal(response.headers.get('cache-control'), 'no-store', path);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
  assert.equal(data.success, response.status < 400, path);
  if (response.status >= 400) { assert.equal(typeof data.error.code, 'string'); assert.equal(typeof data.error.message, 'string'); }
  assert.ok(!/password_hash|passwordHash|\$argon2|JWT_SECRET/.test(JSON.stringify(data)), path);
  return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '' };
};
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  await db.insert(roles).values(['ADMIN', 'MANAGER', 'PT', 'CUSTOMER'].map(roleName => ({ roleName })));
  const password = 'QaFixture@123', passwordHash = await hash(password);
  const actor = async (roleName: string) => {
    const email = `${randomUUID()}@qa01.test`;
    const [user] = await db.insert(users).values({ email, passwordHash }).returning();
    const [role] = await db.select().from(roles).where(eq(roles.roleName, roleName));
    await db.insert(userRoles).values({ userId: user.userId, roleId: role.roleId });
    await db.insert(userProfiles).values({ userId: user.userId, fullName: `QA ${roleName}` });
    return { ...user, roleName, cookie: '' };
  };
  const [admin, manager, pt, customer, stranger] = await Promise.all(['ADMIN','MANAGER','PT','CUSTOMER','CUSTOMER'].map(actor));
  const [gymA, gymB, hiddenGym] = await db.insert(gyms).values([
    { gymName: 'QA Gym A', address: 'A' }, { gymName: 'QA Gym B', address: 'B' }, { gymName: 'QA Hidden', address: 'C', status: 'INACTIVE' },
  ]).returning();
  const [assignment] = await db.insert(gymManagers).values({ gymId: gymA.gymId, userId: manager.userId }).returning();
  const [trainer] = await db.insert(gymTrainers).values({ gymId: gymA.gymId, userId: pt.userId, availability: 'ACCEPTING' }).returning();
  const [pkg] = await db.insert(packages).values({ gymId: gymA.gymId, packageName: 'QA package', price: '150000.00', durationDays: 30 }).returning();
  const { app } = await import('../src/app.js');
  const { authService } = await import('../src/services/auth.service.js');
  assert.equal((authService as unknown as {database:typeof db}).database, db, 'Real AuthService must use the disposable database instance');
  const { signJwt } = await import('../src/utils/jwt.js');
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const path = `/gyms/${gymA.gymId}`, other = `/gyms/${gymB.gymId}`, id = randomUUID();
  const privateRoutes = securityPrivateRoutes(path, id);
  await run(`All ${privateRoutes.length} private routes require cookies before controllers`, async () => {
    for (const [method, route] of privateRoutes) assert.equal((await request(method, route, '', method === 'GET' ? undefined : {})).status, 401, `${method} ${route}`);
  });
  await run('Real login/cookies return authoritative roles and safe session projection', async () => {
    for (const user of [admin, manager, pt, customer, stranger]) {
      const login = await request('POST','/auth/login','',{ email: user.email, password });
      assert.equal(login.status, 200); assert.deepEqual(login.data.data.roles,[user.roleName]); assert.ok(login.cookie);
      user.cookie = login.cookie;
      const me = await request('GET','/auth/me',user.cookie); assert.equal(me.data.data.user_id,user.userId);
    }
  });
  await run('Concurrent registration maps a real unique conflict to safe 409', async () => {
    const holder = await pool.connect(), email = `${randomUUID()}@qa01.test`;
    let pending: ReturnType<typeof request> | undefined;
    try {
      await holder.query('BEGIN');
      await holder.query('INSERT INTO users(email,password_hash) VALUES ($1,$2)',[email,passwordHash]);
      pending = request('POST','/auth/register','',{email,password,full_name:'QA concurrent'});
      const pid = (await holder.query('SELECT pg_backend_pid() pid')).rows[0].pid;
      const deadline = Date.now() + 5000;
      let blocked = false;
      while (Date.now() < deadline) {
        blocked = (await pool.query('SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))) blocked',[pid])).rows[0].blocked;
        if (blocked) break;
        await new Promise(resolve => setTimeout(resolve,10));
      }
      assert.ok(blocked,'Registration must wait on the real unique constraint');
      await holder.query('COMMIT');
      const res = await pending; assert.equal(res.status,409); assert.equal(res.data.error.code,'EMAIL_ALREADY_EXISTS');
    } finally { await holder.query('ROLLBACK'); holder.release(); await pending; }
  });
  await run('Concurrent profile phone conflict is 409 and rolls back both profile and account', async () => {
    const holder = await pool.connect(), phone = '0912345678';
    let pending: ReturnType<typeof request> | undefined;
    try {
      await holder.query('BEGIN');
      await holder.query('UPDATE users SET phone=$1 WHERE user_id=$2',[phone,stranger.userId]);
      pending = request('PATCH','/users/me/profile',customer.cookie,{phone,full_name:'Must roll back'});
      const pid = (await holder.query('SELECT pg_backend_pid() pid')).rows[0].pid, deadline = Date.now()+5000;
      let blocked = false;
      while (Date.now()<deadline) {
        blocked = (await pool.query('SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1::int=ANY(pg_blocking_pids(pid))) blocked',[pid])).rows[0].blocked;
        if (blocked) break;
        await new Promise(resolve=>setTimeout(resolve,10));
      }
      assert.ok(blocked,'Profile write must wait on the real unique constraint');
      await holder.query('COMMIT');
      const res = await pending; assert.equal(res.status,409); assert.equal(res.data.error.code,'PHONE_ALREADY_EXISTS');
      const view = await request('GET','/users/me/profile',customer.cookie);
      assert.equal(view.data.data.phone,null); assert.equal(view.data.data.profile.full_name,'QA CUSTOMER');
    } finally { await holder.query('ROLLBACK'); holder.release(); await pending; }
  });
  await run('Public Gym/PT/gallery/packages/reviews expose only public projections', async () => {
    for (const route of [path,`${path}/trainers`,`${path}/trainers/${trainer.gymTrainerId}`,`${path}/packages`,`${path}/images`,`${path}/reviews`,`${path}/trainers/${trainer.gymTrainerId}/reviews`]) {
      const res = await request('GET',route); assert.equal(res.status,200,route);
      assert.ok(!JSON.stringify(res.data).includes(pt.email)); assert.ok(!/hidden_by|hidden_reason|processing_note|temporary_password/.test(JSON.stringify(res.data)));
    }
    assert.equal((await request('GET',`/gyms/${hiddenGym.gymId}`)).status,404);
  });
  await run('Spoofed JWT ADMIN claim cannot grant account/moderation/Gym permissions', async () => {
    const cookie = `${config.cookie.name}=${signJwt({sub:customer.userId,email:admin.email,roles:['ADMIN']})}`;
    for (const route of ['/admin/users','/admin/roles','/admin/reviews','/admin/gyms',`${path}/management/packages`,`${path}/reports`]) assert.equal((await request('GET',route,cookie)).status,403,route);
    assert.equal((await request('POST','/gyms',cookie,{gym_name:'Spoof',address:'Spoof'})).status,403);
  });
  await run('Manager A cannot read/write private Gym B domains', async () => {
    for (const route of [`${other}/management/packages`,`${other}/management/trainers`,`${other}/managers`,`${other}/reports`,`${other}/consultation-requests`,`${other}/management/images`,`${other}/pt-registrations`,`${other}/pt-appointments`,`${other}/memberships`]) assert.equal((await request('GET',route,manager.cookie)).status,403,route);
    assert.equal((await request('PATCH',other,manager.cookie,{gym_name:'Spoof'})).status,403);
  });
  let paymentId = '', membershipId = '', registrationId = '', reportId = '';
  await run('Checkout prices are server-owned; retry creates exactly one Payment/Membership', async () => {
    const body = { package_id: pkg.packageId, payment_method: 'cash' }, key = randomUUID();
    assert.equal((await request('POST',`${path}/payments`,customer.cookie,{...body,amount:'0.00'},{'Idempotency-Key':key})).status,400);
    const first = await request('POST',`${path}/payments`,customer.cookie,body,{'Idempotency-Key':key}); assert.equal(first.status,201);
    paymentId = first.data.data.payment.payment_id; membershipId = first.data.data.membership.membership_id;
    assert.equal(first.data.data.payment.amount,'150000.00');
    const retry = await request('POST',`${path}/payments`,customer.cookie,body,{'Idempotency-Key':key}); assert.equal(retry.data.data.payment.payment_id,paymentId);
    assert.equal(retry.data.data.membership.membership_id,membershipId);
    assert.equal((await request('GET',`/payments/${paymentId}`,stranger.cookie)).status,404);
    assert.equal((await request('GET','/memberships/me',stranger.cookie)).data.data.length,0);
  });
  await run('PT Registration binds Customer/Membership/Trainer/Gym ownership', async () => {
    const body = { membership_id: membershipId, gym_trainer_id: trainer.gymTrainerId };
    const denied = await request('POST',`${path}/pt-registrations`,stranger.cookie,body); assert.ok([403,404].includes(denied.status));
    assert.ok([403,404].includes((await request('POST',`${other}/pt-registrations`,customer.cookie,body)).status));
    const created = await request('POST',`${path}/pt-registrations`,customer.cookie,body); assert.equal(created.status,201);
    registrationId = created.data.data.registration_id;
    assert.equal((await request('GET','/pt-registrations/me',stranger.cookie)).data.data.length,0);
  });
  await run('Reports keep Customer ownership and Manager scope across domains', async () => {
    const created = await request('POST',`${path}/reports`,customer.cookie,{content:'QA thiết bị cần kiểm tra'}); assert.equal(created.status,201); reportId = created.data.data.report_id;
    assert.equal((await request('GET','/reports/me',stranger.cookie)).data.data.length,0);
    assert.equal((await request('PATCH',`${other}/reports/${reportId}/investigate`,manager.cookie,{})).status,403);
    assert.equal((await request('PATCH',`${path}/reports/${reportId}/investigate`,manager.cookie,{})).status,200);
  });
  await run('Temporary-password gate allows session/password/logout but blocks profile and business', async () => {
    await db.update(users).set({mustChangePassword:true}).where(eq(users.userId,customer.userId));
    assert.equal((await request('GET','/auth/me',customer.cookie)).status,200);
    for (const route of ['/users/me/profile','/payments/me','/memberships/me','/pt-registrations/me','/reports/me']) {
      const res = await request('GET',route,customer.cookie); assert.equal(res.status,403,route); assert.equal(res.data.error.code,'PASSWORD_CHANGE_REQUIRED');
    }
    const update = await request('PATCH','/users/me/profile',customer.cookie,{full_name:'Blocked'}); assert.equal(update.data.error.code,'PASSWORD_CHANGE_REQUIRED');
    assert.equal((await request('POST','/auth/change-password',customer.cookie,{current_password:password,new_password:'QaChanged@456'})).status,200);
    assert.equal((await request('GET','/users/me/profile',customer.cookie)).status,200);
  });
  await run('Suspension immediately blocks old cookies without deleting memberships/registrations', async () => {
    await db.update(users).set({status:'SUSPENDED'}).where(eq(users.userId,customer.userId));
    for (const route of ['/auth/me','/users/me/profile','/payments/me','/memberships/me','/pt-registrations/me','/pt-appointments/me','/reports/me',`${path}/reviews/me`]) assert.ok([401,403].includes((await request('GET',route,customer.cookie)).status),route);
    await db.update(users).set({status:'ACTIVE'}).where(eq(users.userId,customer.userId));
    assert.equal((await request('GET',`/payments/${paymentId}`,customer.cookie)).status,200);
    assert.equal((await request('GET','/pt-registrations/me',customer.cookie)).data.data[0].registration_id,registrationId);
  });
  await run('Revoked Manager assignment and revoked Admin role invalidate existing cookies', async () => {
    await db.update(gymManagers).set({status:'INACTIVE'}).where(eq(gymManagers.gymManagerId,assignment.gymManagerId));
    for (const route of [`${path}/management/packages`,`${path}/reports`,`${path}/consultation-requests`,`${path}/management/images`]) assert.equal((await request('GET',route,manager.cookie)).status,403);
    await db.delete(userRoles).where(eq(userRoles.userId,admin.userId));
    for (const route of ['/admin/users','/admin/roles','/admin/reviews','/admin/gyms']) assert.equal((await request('GET',route,admin.cookie)).status,403);
  });
  console.log(`PASS: ${checks} QA-01 full-app HTTP/DB groups, ${privateRoutes.length} private routes.`);
} finally {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  await pool.end(); await adminConnection.query(`DROP DATABASE "${name}"`); await adminConnection.end();
  await rm(images,{recursive:true,force:true});
}
