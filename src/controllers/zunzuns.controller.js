const Zunzum = require("../models/Zunzum");

exports.create = async (req, res) => {
  try {
    const { text, isAnonymous } = req.body;

    const zunzum = await Zunzum.create({
      author: req.user._id,
      text,
      isAnonymous,
      likes: 0,
    });

    res.status(201).json(zunzum);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar zunzum" });
  }
};
