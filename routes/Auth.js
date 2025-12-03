const express = require("express");
const authEp  = require("../end-point/auth-ep");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();


router.get(
  "/test",
  authEp.test
);

router.post('/login', authEp.userLogin);
router.post('/register', authEp.userRegister);

module.exports = router;
