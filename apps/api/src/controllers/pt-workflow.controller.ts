import type { Request, Response, NextFunction } from 'express';
import { ptWorkflowService } from '../services/pt-workflow.service.js';
import { ptGymParams, ptResourceParams, ptTrainerParams, ptEmpty, ptPage, ptRegisterInput, ptAppointmentInput, ptTimes, ptReason, ptOptionalNote, ptAvailability } from '../validators/pt-workflow.validator.js';
import { UnauthorizedError } from '../utils/errors.js';
export const createPtWorkflowController = (service = ptWorkflowService) => {
  const actor = (req: Request) => { if (!req.user) throw new UnauthorizedError(); return req.user.userId; };
  const action = (status: number, run: (req: Request) => Promise<object>) => async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(status).json({ success: true, ...await run(req) }); } catch (error) { next(error); }
  };
  const list = (kind: 'registrations' | 'appointments', mine: boolean) => action(200, req => {
    const gymId = mine ? (ptEmpty.parse(req.params), undefined) : ptGymParams.parse(req.params).gymId;
    return service.list(actor(req), kind, ptPage.parse(req.query), gymId);
  });
  const appointmentAction = (name: 'confirm' | 'reschedule' | 'cancel' | 'complete') => action(200, async req => {
    const { gymId, resourceId } = ptResourceParams.parse(req.params); ptEmpty.parse(req.query);
    const input = name === 'reschedule' ? ptTimes.parse(req.body) : name === 'cancel' ? ptReason.parse(req.body) : ptOptionalNote.parse(req.body ?? {});
    return { data: await service.appointmentAction(actor(req), gymId, resourceId, name, input) };
  });
  return {
    memberships: action(200, req => service.listMemberships(actor(req), ptGymParams.parse(req.params).gymId, ptPage.parse(req.query))),
    mineRegistrations: list('registrations', true), gymRegistrations: list('registrations', false),
    mineAppointments: list('appointments', true), gymAppointments: list('appointments', false),
    register: action(201, async req => { const { gymId } = ptGymParams.parse(req.params); ptEmpty.parse(req.query);
      return { data: await service.register(actor(req), gymId, ptRegisterInput.parse(req.body)) }; }),
    cancelRegistration: action(200, async req => { const { gymId, resourceId } = ptResourceParams.parse(req.params); ptEmpty.parse(req.query);
      return { data: await service.cancelRegistration(actor(req), gymId, resourceId, ptReason.parse(req.body).note) }; }),
    createAppointment: action(201, async req => { const { gymId } = ptGymParams.parse(req.params); ptEmpty.parse(req.query);
      return { data: await service.createAppointment(actor(req), gymId, ptAppointmentInput.parse(req.body)) }; }),
    availability: action(200, async req => { const { gymId, trainerId } = ptTrainerParams.parse(req.params); ptEmpty.parse(req.query);
      return { data: await service.availability(actor(req), gymId, trainerId, ptAvailability.parse(req.body).availability) }; }),
    confirm: appointmentAction('confirm'), reschedule: appointmentAction('reschedule'), cancel: appointmentAction('cancel'), complete: appointmentAction('complete'),
  };
};
