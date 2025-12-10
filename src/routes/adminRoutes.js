const express = require("express");
const LoginLog = require("../models/LoginLog");
const router = express.Router();

// ROTA: listar todos os logins
router.get("/logins", async (req, res) => {
  try {
    const logs = await LoginLog.find().sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar logs" });
  }
});

module.exports = router;
