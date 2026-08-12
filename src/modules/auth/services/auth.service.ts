import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { SignOptions } from 'jsonwebtoken';

import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { LoginDto } from '../dto/login.dto.js';
import { RegisterDto } from '../dto/register.dto.js';

interface AccessTokenPayload {
  sub: string;
  email: string;
}

interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

type RefreshTokenRecord = {
  id: string;
  revokedAt: Date | null;
  expiresAt: Date;
  tokenHash: string;
};

type RefreshTokenPrismaClient = {
  findUnique(args: {
    where: { jti: string };
  }): Promise<RefreshTokenRecord | null>;
  updateMany(args: {
    where: {
      id?: string;
      jti?: string;
      revokedAt?: Date | null;
      userId?: string;
    };
    data: { revokedAt: Date };
  }): Promise<{ count: number }>;
  create(args: {
    data: {
      userId: string;
      jti: string;
      tokenHash: string;
      expiresAt: Date;
    };
  }): Promise<unknown>;
};

type PrismaServiceLike = {
  refreshToken: RefreshTokenPrismaClient;
  $transaction<T>(
    fn: (tx: { refreshToken: RefreshTokenPrismaClient }) => Promise<T>,
  ): Promise<T>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        passwordHash,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        isEmailVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      user,
    };
  }

  async login(dto: LoginDto, response: Response) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.createTokenPair(user.id, user.email);

    await this.storeRefreshToken(
      user.id,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );

    this.setRefreshCookie(response, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken: tokens.accessToken,
    };
  }

  getRefreshCookieName(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_COOKIE_NAME');
  }

  async refresh(refreshToken: string, response: Response) {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      this.clearRefreshCookie(response);

      throw new UnauthorizedException('Invalid refresh token');
    }

    const prismaClient = this.prisma as unknown as PrismaServiceLike;

    const storedToken = await prismaClient.refreshToken.findUnique({
      where: {
        jti: payload.jti,
      },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      this.clearRefreshCookie(response);

      throw new UnauthorizedException('Refresh session is invalid');
    }

    const validToken = await argon2.verify(storedToken.tokenHash, refreshToken);

    if (!validToken) {
      this.clearRefreshCookie(response);

      throw new UnauthorizedException('Refresh session is invalid');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user || !user.isActive) {
      this.clearRefreshCookie(response);

      throw new UnauthorizedException('User account is unavailable');
    }

    const tokens = await this.createTokenPair(user.id, user.email);

    const newTokenHash = await argon2.hash(tokens.refreshToken);

    const rotationResult = await prismaClient.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: {
          id: storedToken.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      if (revoked.count !== 1) {
        throw new UnauthorizedException('Refresh token was already used');
      }

      return tx.refreshToken.create({
        data: {
          userId: user.id,
          jti: this.extractJti(tokens.refreshToken),
          tokenHash: newTokenHash,
          expiresAt: tokens.refreshTokenExpiresAt,
        },
      });
    });

    if (!rotationResult) {
      this.clearRefreshCookie(response);

      throw new UnauthorizedException('Unable to rotate refresh token');
    }

    this.setRefreshCookie(response, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
    };
  }

  async logout(refreshToken: string | undefined, response: Response) {
    const prismaClient = this.prisma as unknown as PrismaServiceLike;

    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
          refreshToken,
          {
            secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          },
        );

        await prismaClient.refreshToken.updateMany({
          where: {
            jti: payload.jti,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });
      } catch {
        // Logout should remain idempotent.
      }
    }

    this.clearRefreshCookie(response);

    return {
      message: 'Logged out successfully',
    };
  }

  async logoutAll(userId: string) {
    const prismaClient = this.prisma as unknown as PrismaServiceLike;

    await prismaClient.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'All sessions have been logged out',
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        isEmailVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is unavailable');
    }

    return {
      user,
    };
  }

  private async createTokenPair(
    userId: string,
    email: string,
  ): Promise<TokenPair> {
    const jti = randomUUID();

    const accessPayload: AccessTokenPayload = {
      sub: userId,
      email,
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      jti,
    };

    const accessExpiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    );

    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresIn as SignOptions['expiresIn'],
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn as SignOptions['expiresIn'],
    });

    const refreshTokenExpiresAt = new Date(
      Date.now() + this.parseDuration(refreshExpiresIn),
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
  ) {
    const prismaClient = this.prisma as unknown as PrismaServiceLike;
    const payload = this.jwtService.decode<RefreshTokenPayload>(refreshToken);

    if (!payload?.jti) {
      throw new UnauthorizedException('Unable to create refresh session');
    }

    const tokenHash = await argon2.hash(refreshToken);

    return prismaClient.refreshToken.create({
      data: {
        userId,
        jti: payload.jti,
        tokenHash,
        expiresAt,
      },
    });
  }

  private extractJti(refreshToken: string): string {
    const payload = this.jwtService.decode<RefreshTokenPayload>(refreshToken);

    if (!payload?.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return payload.jti;
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    response.cookie(
      this.configService.getOrThrow<string>('JWT_REFRESH_COOKIE_NAME'),
      refreshToken,
      {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/api/v1/auth',
        maxAge: this.parseDuration(
          this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
        ),
      },
    );
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(
      this.configService.getOrThrow<string>('JWT_REFRESH_COOKIE_NAME'),
      {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite:
          this.configService.get<string>('NODE_ENV') === 'production'
            ? 'none'
            : 'lax',
        path: '/api/v1/auth',
      },
    );
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new Error(`Unsupported JWT duration format: ${duration}`);
    }

    const value = Number(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}
