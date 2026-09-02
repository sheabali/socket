import httpStatus from "http-status";
import ApiError from "../../../errors/apiError";
import prisma from "../../../lib/prisma";
import { hashPassword, comparePassword } from "../../../utils/passwordHelper";
import { jwtHelpers } from "../../../utils/jwtHelpers";
import config from "../../../config";

const registerUser = async (payload: any) => {
  const { email, password, name } = payload;

  const isExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User with this email already exists");
  }

  const hashedPassword = await hashPassword(password);

  const result = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Log activity
  const { AnalyticsService } = require("../../../services/analytics.service");
  AnalyticsService.logActivity(result.id, "ACCOUNT_CREATED", "New user registered");

  return result;
};

const loginUser = async (payload: any) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const isPasswordMatched = await comparePassword(password, user.passwordHash);

  if (!isPasswordMatched) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

  // Create JWT Payload
  const jwtPayload = {
    id: user.id,
    role: user.role,
    email: user.email,
  };

  const accessToken = jwtHelpers.generateToken(
    jwtPayload,
    config.jwt.secret as string,
    config.jwt.expires_in as any
  );

  const refreshToken = jwtHelpers.generateToken(
    jwtPayload,
    config.jwt.refresh_secret as string,
    config.jwt.refresh_expires_in as any
  );

  // Update lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Log activity
  const { AnalyticsService } = require("../../../services/analytics.service");
  AnalyticsService.logActivity(user.id, "LOGIN", "User logged in");

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileCompleted: user.profileCompleted,
    },
  };
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      creditsRemaining: true,
      profileCompleted: true,
      profilePictureUrl: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

export const AuthService = {
  registerUser,
  loginUser,
  getMe,
};
