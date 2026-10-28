import {Router} from 'express';
import {authenticate} from '../middleware/auth.middleware.js';
import {adminUserService} from '../services/admin-user.service.js';
import {createAdminUserController} from '../controllers/admin-user.controller.js';
export const createAdminUserRouter=(service=adminUserService)=>{const router=Router(),c=createAdminUserController(service);router.get('/admin/users',authenticate,c.list);router.get('/admin/roles',authenticate,c.roles);router.patch('/admin/users/:userId/status',authenticate,c.status);return router;};
export const adminUserRouter=createAdminUserRouter();
