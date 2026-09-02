import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import prisma from "../../lib/prisma";
import ApiError from "../../errors/apiError";

const rateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user.id;

  try {
    // 1. Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        plan: true,
        creditsRemaining: true,
        analysisLastResetAt: true,
      },
    });

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    // 2. Pro users have unlimited access
    if (user.plan === "PRO") {
      return next();
    }

    // 3. Handle Monthly Reset for Free Tier (Lazy Reset)
    const now = new Date();
    const lastReset = new Date(user.analysisLastResetAt);

    // Check if we are in a new month compared to the last reset
    const isNewMonth = 
      now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear();

    let currentCredits = user.creditsRemaining;

    if (isNewMonth) {
      // Reset credits for the new month
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          creditsRemaining: 3,
          analysisLastResetAt: now,
        },
      });
      currentCredits = updatedUser.creditsRemaining;
    }

    // 4. Check if credits are available
    if (currentCredits <= 0) {
      // Calculate next reset date (1st of next month)
      const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      return res.status(httpStatus.TOO_MANY_REQUESTS).json({
        success: false,
        message: "Free tier limit reached",
        errorMessages: [
          {
            path: "credits",
            message: "You've used all 3 free analyses this month. Upgrade to Pro for unlimited."
          }
        ],
        nextResetDate: nextResetDate.toISOString().split('T')[0],
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default rateLimit;
