const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Payment = require("../models/paymentModel");
const User = require("../models/userModel");

/**
 * MVP payment endpoint.
 * Supports mock payments for local testing.
 * On success, flips user.premiumStatus = true.
 */
exports.createPremiumPayment = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("Not authenticated", 401));
  if (req.user.role !== "tenant") {
    return next(new AppError("Only tenants can purchase premium", 403));
  }

  const { amount, method } = req.body;
  const normalizedMethod = method || "mock";
  const payment = await Payment.create({
    user: req.user._id,
    amount: Number(amount || 0) || 0,
    method: normalizedMethod,
    status: "success", // MVP: treat as successful
  });

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { premiumStatus: true },
    { new: true }
  );
  updated.password = undefined;

  res.status(200).json({
    status: "success",
    data: {
      payment,
      user: updated,
    },
  });
});