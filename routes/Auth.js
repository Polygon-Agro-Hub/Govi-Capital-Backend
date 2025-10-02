const express = require("express");
const authEp  = require("../end-point/auth-ep");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();


router.get(
  "/test",
  authEp.test
);

module.exports = router;
