import type {Request,Response,NextFunction} from 'express';
import { z } from 'zod';
import {adminUserService} from '../services/admin-user.service.js';
import {adminUserParams} from '../validators/admin-user.validator.js';
export const createAdminUserController=(service=adminUserService)=>({
 list:async(req:Request,res:Response,next:NextFunction)=>{res.setHeader('Cache-Control','no-store');try{res.json({success:true,data:await service.list(req.user!.userId,req.query)});}catch(error){next(error);}},
 roles:async(req:Request,res:Response,next:NextFunction)=>{res.setHeader('Cache-Control','no-store');try{z.object({}).strict().parse(req.query);res.json({success:true,data:await service.roles(req.user!.userId)});}catch(error){next(error);}},
 status:async(req:Request,res:Response,next:NextFunction)=>{res.setHeader('Cache-Control','no-store');try{z.object({}).strict().parse(req.query);const p=adminUserParams.parse(req.params);res.json({success:true,data:await service.status(req.user!.userId,p.userId,req.body)});}catch(error){next(error);}},
});
