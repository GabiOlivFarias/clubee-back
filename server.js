require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const LoginLog = require("./src/models/LoginLog");

// Conexão ao MongoDB
const connectDB = require("./src/config/db");
connectDB();

// Passport
const passport = require("./src/config/passport");

const app = express();
app.set("trust proxy", 1);

// Rotas admin
const adminRoutes = require("./src/routes/adminRoutes");
app.use("/admin", adminRoutes);

const progressRoutes = require('./src/routes/progressRoutes');
app.use('/api/progress', progressRoutes);

// Porta
const PORT = process.env.PORT || 3001;

// cors
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

// Sessoo armazenada no MongoDB
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 7 * 24 * 60 * 60 // 7 dias
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    }
  })
);

// Middlewares
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

// AUTENTICAÇÃO GOOGLE

// Inicia login
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback Goog
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login/failed",
    session: true
  }),
  async (req, res) => {
    console.log("✅ Usuário autenticado com sucesso!");

    try {
      await LoginLog.create({
        userId: req.user._id,
        email: req.user.email
      });
      console.log("📌 Login registrado no MongoDB!");
    } catch (err) {
      console.error("❌ Erro ao salvar login:", err);
    }

    const redirectUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(redirectUrl);
  }
);

// Logout
app.get("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect(process.env.CLIENT_URL);
    });
  });
});

// Quem está logado
app.get("/api/user/me", (req, res) => {
  if (req.user) return res.json({ success: true, user: req.user });

  res.status(401).json({ success: false, message: "Não autenticado" });
});

// Middleware protegido
const isAuthenticated = (req, res, next) => {
  if (req.user) return next();
  res.status(401).json({ success: false, message: "Não autorizado" });
};

// ROTA PARA VER LOGINS
app.get("/api/logins", async (req, res) => {
  try {
    const logs = await LoginLog.find().sort({ date: -1 });
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: "Erro ao buscar logs" });
  }
});

// ZUNZUNS (Mock)
const zunzuns = [
  {
    id: 1,
    author: "Google User",
    text: "Meu primeiro zunzum na Clubee! Olá mundo!",
    date: new Date().toISOString(),
    likes: 5,
    isAnonymous: false
  }
];

app.get("/api/zunzuns", (req, res) => {
  const sorted = [...zunzuns].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  res.json(sorted);
});

app.post("/api/zunzuns", isAuthenticated, (req, res) => {
  const { text, isAnonymous } = req.body;

  if (!text || text.length > 280) {
    return res.status(400).json({
      success: false,
      message: "Texto inválido (máx 280 caracteres)."
    });
  }

  const newZunzum = {
    id: Date.now(),
    author: isAnonymous ? "Abelha Anônima 🤫" : req.user.displayName,
    text,
    date: new Date().toISOString(),
    likes: 0,
    isAnonymous: !!isAnonymous
  };

  zunzuns.push(newZunzum);

  res.status(201).json({ success: true, zunzum: newZunzum });
});

// ROTA ROOT
app.get("/", (req, res) => {
  res.send("Clubee Backend is running.");
});

// SERVIDOR
app.listen(PORT, () => {
  console.log(`🎉 Servidor backend rodando em http://localhost:${PORT}`);
});

module.exports = app;
