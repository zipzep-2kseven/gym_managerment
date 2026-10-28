import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { packageTestHarness } from './package-test-fixture.js';
import { createAdminGymInspectionService } from '../src/services/admin-gym-inspection.service.js';
import { createAdminGymInspectionRouter } from '../src/routes/admin-gym-inspection.routes.js';
import { createReportService } from '../src/services/report.service.js';
import { createGalleryService } from '../src/services/gallery.service.js';
import { createGymLifecycleService } from '../src/services/gym-lifecycle.service.js';
import { createStaffingService } from '../src/services/staffing.service.js';
import { createPtWorkflowService } from '../src/services/pt-workflow.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { signJwt } from '../src/utils/jwt.js';
import { config } from '../src/config/index.js';
import { users, userRoles } from '../src/database/schema/index.js';
const h = await packageTestHarness(), service = createAdminGymInspectionService(h.database);
const app = express(); app.use(cookieParser(), createAdminGymInspectionRouter(service), errorHandler);
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
const port = (server.address() as { port: number }).port;
let groups = 0;
const run = async (name: string, fn: () => Promise<void>) => { await fn(); groups++; console.log(`PASS inspection: ${name}`); };
try {
  const f = await h.fixture();
  const result = await h.pool.query(`INSERT INTO gym_reports(user_id,gym_id,title,content,report_type)
    VALUES ($1,$2,'Gym A report','private gym A content','OTHER') RETURNING report_id`, [f.admin, f.gymA.gymId]);
  // Seed every projection, including both review targets, with approved relational data.
  const customer = await h.user('CUSTOMER'), pt = await h.user('PT');
  await h.pool.query(`INSERT INTO user_profiles(user_id,full_name) VALUES ($1,'Customer A'),($2,'Trainer A')`, [customer, pt]);
  const type = (await h.pool.query(`INSERT INTO equipment_types(name) VALUES ('Treadmill') RETURNING equipment_type_id`)).rows[0].equipment_type_id;
  await h.pool.query(`INSERT INTO equipments(gym_id,equipment_type_id,equipment_code,condition,status) VALUES ($1,$2,'A-001','GOOD','ACTIVE')`, [f.gymA.gymId, type]);
  const trainer = (await h.pool.query(`INSERT INTO gym_trainers(gym_id,user_id,specialization) VALUES ($1,$2,'Yoga') RETURNING gym_trainer_id`, [f.gymA.gymId, pt])).rows[0].gym_trainer_id;
  await h.pool.query(`INSERT INTO pt_working_schedules(gym_trainer_id,day_of_week,start_time,end_time) VALUES ($1,'MONDAY','08:00','17:00')`, [trainer]);
  await h.pool.query(`INSERT INTO pt_social_links(gym_trainer_id,platform,url) VALUES ($1,'WEBSITE','https://example.test')`, [trainer]);
  const member = (await h.pool.query(`INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status) VALUES ($1,$2,$3,'2020-01-01','2099-12-31',100,'ACTIVE') RETURNING membership_id`, [customer, f.gymA.gymId, f.packages[0].packageId])).rows[0].membership_id;
  await h.pool.query(`INSERT INTO payments(user_id,gym_id,package_id,amount,payment_method) VALUES ($1,$2,$3,100,'CASH')`, [customer, f.gymA.gymId, f.packages[0].packageId]);
  const reg = (await h.pool.query(`INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) VALUES ($1,$2,'ACTIVE') RETURNING registration_id`, [member, trainer])).rows[0].registration_id;
  await h.pool.query(`INSERT INTO pt_appointments(registration_id,start_time,end_time,status) VALUES ($1,now()+interval '1 day',now()+interval '25 hours','PENDING')`, [reg]);
  await h.pool.query(`INSERT INTO consultation_requests(gym_id,full_name,phone) VALUES ($1,'Guest A','0901234567')`, [f.gymA.gymId]);
  await h.pool.query(`INSERT INTO gym_images(gym_id,image_url,caption) VALUES ($1,'private-storage-sentinel.png','Room A')`, [f.gymA.gymId]);
  // Reviews are inserted through their customer workflow, respecting review triggers.
  const { createReviewService } = await import('../src/services/review.service.js');
  const review = createReviewService(h.database);
  await review.create(customer, { kind: 'gym', id: f.gymA.gymId }, { rating: 5, comment: 'Good gym' });
  await h.pool.query(`INSERT INTO pt_appointments(registration_id,start_time,end_time,status) VALUES ($1,now()-interval '2 days',now()-interval '47 hours','COMPLETED')`, [reg]);
  await review.create(customer, { kind: 'trainer', id: trainer, gymId: f.gymA.gymId }, { rating: 4, comment: 'Good trainer' });
  const resources = ['trainers','schedules','social','packages','memberships','payments','consultations','registrations','appointments','equipment','images','reports','gym-reviews','trainer-reviews'];
  await run('All fourteen resource lists are paginated, scoped and omit storage/account secrets', async () => {
    for (const resource of resources) {
      const a = await service.list(f.admin, f.gymA.gymId, resource, {});
      assert.ok(a.pagination.totalItems > 0, resource); assert.ok(a.data.every(row => typeof row.id === 'string'));
      const foreign = await service.list(f.admin, f.gymB.gymId, resource, {});
      assert.equal(foreign.data.some(row => a.data.some(item => item.id === row.id)), false, resource);
      for (const secret of ['private-storage-sentinel', 'password_hash', 'image_url']) assert.ok(!JSON.stringify(a).includes(secret), resource);
      assert.equal((await service.list(f.admin, f.gymA.gymId, resource, { page: 999 })).data.length, 0);
    }
    const pages = await service.list(f.admin, f.gymA.gymId, 'packages', { pageSize: 2 });
    assert.equal(pages.pagination.totalItems, 4); assert.equal(pages.pagination.hasNextPage, true);
    assert.equal((await service.list(f.admin, f.gymA.gymId, 'packages', { search: 'Hidden', status: 'INACTIVE' })).data.length, 1);
  });
  await run('Current Admin role/account gate, strict queries and HTTP no-store', async () => {
    for (const actor of [f.manager, customer, pt]) await assert.rejects(service.list(actor, f.gymA.gymId, 'payments', {}), { statusCode: 403 });
    for (const query of [{ page: 0 }, { pageSize: 101 }, { gym_id: f.gymB.gymId }]) await assert.rejects(service.list(f.admin, f.gymA.gymId, 'packages', query));
    await assert.rejects(service.list(f.admin, f.gymA.gymId, '__proto__', {}), { statusCode: 404 });
    await assert.rejects(service.list(f.admin, randomUUID(), 'packages', {}), { statusCode: 404 });
    const url = `http://127.0.0.1:${port}/admin/gyms/${f.gymA.gymId}/inspection/packages`;
    assert.equal((await fetch(url)).status, 401);
    const response = await fetch(url, { headers: { Cookie: `${config.cookie.name}=${signJwt({ sub: f.admin, email: 'claim@test.local', roles: [] })}` } });
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    const actor = await h.user('ADMIN');
    await h.database.update(users).set({ mustChangePassword: true }).where(eq(users.userId, actor));
    await assert.rejects(service.list(actor, f.gymA.gymId, 'packages', {}), { statusCode: 403 });
    await h.database.update(users).set({ mustChangePassword: false, status: 'SUSPENDED' }).where(eq(users.userId, actor));
    await assert.rejects(service.list(actor, f.gymA.gymId, 'packages', {}), { statusCode: 403 });
    await h.database.update(users).set({ status: 'ACTIVE' }).where(eq(users.userId, actor));
    await h.database.delete(userRoles).where(eq(userRoles.userId, actor));
    await assert.rejects(service.list(actor, f.gymA.gymId, 'packages', {}), { statusCode: 403 });
  });
  await run('Admin reads reports but operational writes are rejected in every affected service', async () => {
    const reports = createReportService(h.database), gallery = createGalleryService(h.database), life = createGymLifecycleService(h.database);
    assert.ok((await reports.list(f.admin, {}, f.gymA.gymId)).data.length);
    await assert.rejects(reports.change(f.admin, f.gymA.gymId, result.rows[0].report_id, 'investigate', {}), { statusCode: 403 });
    await reports.change(f.manager, f.gymA.gymId, result.rows[0].report_id, 'investigate', {});
    await assert.rejects(h.service.create(f.admin, f.gymA.gymId, { package_name: 'Denied', duration_days: 30, price: '10' }), { statusCode: 403 });
    await assert.rejects(h.service.update(f.admin, f.gymA.gymId, f.packages[0].packageId, { price: '20' }), { statusCode: 403 });
    await assert.rejects(h.service.setStatus(f.admin, f.gymA.gymId, f.packages[0].packageId, 'INACTIVE'), { statusCode: 403 });
    await assert.rejects(gallery.authorizeUpload(f.admin, f.gymA.gymId), { statusCode: 403 });
    await assert.rejects(gallery.remove(f.admin, f.gymA.gymId, randomUUID()), { statusCode: 403 });
    await assert.rejects(life.assignTrainer(f.admin, f.gymA.gymId, { user_id: pt }), { statusCode: 403 });
    await assert.rejects(life.setTrainerStatus(f.admin, f.gymA.gymId, trainer, 'INACTIVE'), { statusCode: 403 });
    await assert.rejects(createStaffingService(h.database).provisionTrainer(f.admin, f.gymA.gymId, { full_name: 'Denied', email: 'denied@test.local', phone: null }), { statusCode: 403 });
    await assert.rejects(createPtWorkflowService(h.database).cancelRegistration(f.admin, f.gymA.gymId, reg, 'Denied'), { statusCode: 403 });
    assert.equal((await service.list(f.admin, f.gymA.gymId, 'packages', {})).pagination.totalItems, 4);
  });
  await run('Dual Admin/Manager role only permits operational writes at the assigned Gym', async () => {
    const actor = await h.user('ADMIN');
    await h.pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,role_id FROM roles WHERE role_name='MANAGER'", [actor]);
    await assert.rejects(h.service.create(actor, f.gymA.gymId, { package_name: 'Denied', duration_days: 7, price: '10' }), { statusCode: 403 });
    await h.pool.query('INSERT INTO gym_managers(gym_id,user_id) VALUES ($1,$2)', [f.gymB.gymId, actor]);
    assert.equal((await h.service.create(actor, f.gymB.gymId, { package_name: 'Local only', duration_days: 7, price: '10' })).gymId, f.gymB.gymId);
    assert.ok((await service.list(actor, f.gymA.gymId, 'packages', {})).data.length);
  });
  console.log(`PASS: ${groups} Admin inspection integration groups.`);
} finally { await new Promise<void>(resolve => server.close(() => resolve())); await h.close(); }
