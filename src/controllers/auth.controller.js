const LoginLog = require("../models/LoginLog");

await LoginLog.create({
  userId: user._id,
  email: user.email,
  ip: req.ip //
});
