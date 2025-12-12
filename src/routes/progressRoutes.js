const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');

const isAuthenticated = (req, res, next) => {
  if (req.user) return next();
  res.status(401).json({ success: false, message: 'Não autorizado' });
};

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { trail } = req.query;
    if (!trail) return res.status(400).json({ success: false, message: 'trail é required' });

    const records = await Progress.find({ userId: req.user._id, trail }).lean();
    res.json({ success: true, records });
  } catch (err) {
    console.error('Erro GET /api/progress', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar progresso' });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { trail, activityId, completed } = req.body;
    if (!trail || !activityId || typeof completed !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Campos inválidos' });
    }

    const update = {
      completed,
      completedAt: completed ? new Date() : null
    };

    const record = await Progress.findOneAndUpdate(
      { userId: req.user._id, trail, activityId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, record });
  } catch (err) {
    console.error('Erro POST /api/progress', err);
    res.status(500).json({ success: false, message: 'Erro ao salvar progresso' });
  }
});

module.exports = router;
