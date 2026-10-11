import type { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service.js';
import { demoPaymentInput, paymentGymParams, paymentIdParams, paymentKey, paymentListQuery, emptyPaymentQuery } from '../validators/payment.validator.js';
import { UnauthorizedError } from '../utils/errors.js';
export const createPaymentController = (service = paymentService) => {
  const action = (run: (req: Request) => Promise<{ status?: number; data?: unknown; pagination?: unknown }>) => async (req: Request, res: Response, next: NextFunction) => {
    try { const { status = 200, ...envelope } = await run(req); res.status(status).json({ success: true, ...envelope }); }
    catch (error) { next(error); }
  };
  const actor = (req: Request) => { if (!req.user) throw new UnauthorizedError(); return req.user.userId; };
  return {
    create: action(async req => {
      emptyPaymentQuery.parse(req.query);
      const result = await service.createDemo(actor(req), paymentGymParams.parse(req.params).gymId,
        paymentKey.parse(req.get('Idempotency-Key')), demoPaymentInput.parse(req.body));
      return { status: result.replayed ? 200 : 201, data: result };
    }),
    detail: action(async req => { emptyPaymentQuery.parse(req.query); return { data: await service.detail(actor(req), paymentIdParams.parse(req.params).paymentId) }; }),
    payments: action(req => service.list(actor(req), paymentListQuery.parse(req.query), 'payments')),
    memberships: action(req => service.list(actor(req), paymentListQuery.parse(req.query), 'memberships')),
  };
};
