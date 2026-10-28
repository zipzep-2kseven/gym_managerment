import type { Request, Response, NextFunction } from 'express';
import type { GymManager, GymTrainer } from '../database/schema/index.js';
import { staffingService, type createStaffingService } from '../services/staffing.service.js';
import { UnauthorizedError } from '../utils/errors.js';
import { managerProvisionSchema, trainerProvisionSchema, managerAssignSchema,
  emptyBodySchema, gymParamsSchema, managerParamsSchema } from '../validators/staffing.validator.js';

export const assignmentDto = (row: GymManager | GymTrainer) => ({
  gym_id: row.gymId, user_id: row.userId, status: row.status,
  created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
  ...('gymManagerId' in row ? { gym_manager_id: row.gymManagerId, assigned_at: row.assignedAt.toISOString() }
    : { gym_trainer_id: row.gymTrainerId, joined_at: row.joinedAt.toISOString(),
      specialization: row.specialization, experience_years: row.experienceYears,
      bio: row.bio, availability: row.availability }),
});

export const createStaffingController = (service: ReturnType<typeof createStaffingService> = staffingService) => {
  const action = (status: number, run: (req: Request, actor: string) => Promise<unknown>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user?.userId) throw new UnauthorizedError();
        const data = await run(req, req.user.userId);
        res.status(status).json({ success: true, data });
      } catch (error) { next(error); }
    };
  return {
    provisionManager: action(201, async (req, actor) => {
      const result = await service.provisionManager(actor, managerProvisionSchema.parse(req.body));
      return { ...result, assignment: assignmentDto(result.assignment) };
    }),
    provisionTrainer: action(201, async (req, actor) => {
      const { gymId } = gymParamsSchema.parse(req.params);
      const result = await service.provisionTrainer(actor, gymId, trainerProvisionSchema.parse(req.body));
      return { ...result, assignment: assignmentDto(result.assignment) };
    }),
    assignManager: action(200, async (req, actor) => {
      const { gymId } = gymParamsSchema.parse(req.params);
      const { user_id } = managerAssignSchema.parse(req.body);
      return assignmentDto(await service.assignManager(actor, gymId, user_id));
    }),
    listManagers: action(200, async (req, actor) => {
      const { gymId } = gymParamsSchema.parse(req.params);
      return (await service.listManagers(actor, gymId)).map(row => ({ ...assignmentDto(row),
        full_name: row.fullName, email: row.email }));
    }),
    revokeManager: action(200, async (req, actor) => {
      const { gymId, managerId } = managerParamsSchema.parse(req.params);
      emptyBodySchema.parse(req.body ?? {});
      return assignmentDto(await service.revokeManager(actor, gymId, managerId));
    }),
  };
};
