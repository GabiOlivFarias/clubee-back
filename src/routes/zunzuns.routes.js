const express = require("express");
const router = express.Router();
const controller = require("../controllers/zunzums.controller");
const isAuth = require("../middleware/isAuth");

router.post("/", isAuth, controller.create);

module.exports = router;
