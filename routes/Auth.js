const express = require("express");
const authEp = require("../end-point/auth-ep");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/test", authEp.test);

router.post(
    '/login',
    authEp.userLogin
);
router.post(
    '/register',
    authEp.registerUser
);
router.post(
    '/check-user',
    authEp.checkUserExists
);

// Password reset routes
router.post(
    "/forgot-password",
    authEp.forgotPassword
); // Send reset email

router.get(
    "/validate-reset-token/:token",
    authEp.validateResetToken
); // Validate token

router.put(
    "/reset-password",
    authEp.resetPassword
); // Reset password

router.post(
    "/check-phone",
    authEp.checkPhoneNumber
);

router.post(
    "/reset-password-by-phone",
    authEp.resetPasswordByPhone
);

module.exports = router;