import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import ApiError from "../../errors/apiError";
import { jwtHelpers } from "../../utils/jwtHelpers";
import config from "../../config";
import prisma from "../../lib/prisma";

const auth = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;

      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized");
      }

      const verifiedUser = jwtHelpers.verifyToken(token, config.jwt.secret as string);

      if (!verifiedUser) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid or expired token");
      }

      // Check if user still exists
      const user = await prisma.user.findUnique({
        where: {
          id: verifiedUser.id,
        },
      });

      if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "User does not exist");
      }

      if (roles.length > 0 && !roles.includes(user.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to access this resource");
      }

      req.user = verifiedUser;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
