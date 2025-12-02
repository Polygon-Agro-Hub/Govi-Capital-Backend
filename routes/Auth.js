const express = require("express");
const authEp  = require("../end-point/auth-ep");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();


router.get(
  "/test",
  authEp.test
);

router.post('/login', authEp.userLogin);

module.exports = router;
