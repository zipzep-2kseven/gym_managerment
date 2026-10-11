import { randomBytes } from 'node:crypto';
import { hash, Algorithm } from '@node-rs/argon2';
import type { db } from '../database/index.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { AuthService } from './auth.service.js';
import { AppError } from '../utils/errors.js';
import type { TrainerProvisionInput } from '../validators/staffing.validator.js';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const prepareStaffCredential = async () => {
  const temporaryPassword = `Aa1!${randomBytes(24).toString('base64url')}`;
  const passwordHash = await hash(temporaryPassword, { algorithm: Algorithm.Argon2id,
    memoryCost: 65536, timeCost: 3, parallelism: 4, outputLen: 32 });
  return { temporaryPassword, passwordHash };
};
// Caller owns authorization and transaction. Hashing must finish before locks are held.
export const provisionStaffInTransaction = async (tx: Transaction, gymId: string, role: 'MANAGER' | 'PT',
  input: TrainerProvisionInput, credential: Awaited<ReturnType<typeof prepareStaffCredential>>) => {
  const repo = createStaffingRepository(tx);
  const targetRole = await repo.findRole(role);
  if (!targetRole) throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Thiếu cấu hình role.');
  const user = await repo.createAccount(input, credential.passwordHash, targetRole.roleId);
  const assignment = role === 'MANAGER' ? await repo.createManager(gymId, user.userId)
    : await repo.createTrainer(gymId, user.userId, input);
  const session = await new AuthService(tx).getCurrentUser(user.userId);
  return { user: session, assignment, temporary_password: credential.temporaryPassword };
};
