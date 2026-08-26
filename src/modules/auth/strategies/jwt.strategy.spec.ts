import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, jest } from '@jest/globals';

import { JwtStrategy } from './jwt.strategy.js';

const userId = '11111111-1111-4111-8111-111111111111';

function strategyWithUser(user: object | null) {
  const config = {
    getOrThrow: jest.fn(() => 'test-secret'),
  } as unknown as ConfigService;
  const prisma = {
    user: { findUnique: jest.fn(() => Promise.resolve(user)) },
  };

  return {
    strategy: new JwtStrategy(config, prisma as never),
    findUnique: prisma.user.findUnique,
  };
}

describe('JwtStrategy', () => {
  it('rejects an unknown user', async () => {
    const { strategy } = strategyWithUser(null);

    await expect(
      strategy.validate({ sub: userId, email: 'old@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an inactive user', async () => {
    const { strategy } = strategyWithUser({
      id: userId,
      email: 'user@example.com',
      isActive: false,
    });

    await expect(
      strategy.validate({ sub: userId, email: 'user@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses the current user email rather than the token email', async () => {
    const { strategy } = strategyWithUser({
      id: userId,
      email: 'current@example.com',
      isActive: true,
    });

    await expect(
      strategy.validate({ sub: userId, email: 'stale@example.com' }),
    ).resolves.toEqual({ userId, email: 'current@example.com' });
  });
});
