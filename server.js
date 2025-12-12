require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("./src/config/passport");
const LoginLog = require("./src/models/LoginLog");

const connectDB = require("./src/config/db");
connectDB();

const app = express();
app.set("trust proxy", 1);

// ---------- CORS (CORRIGIDO) ----------
const allowedOrigins = [
  process.env.CLIENT_URL,       // produção
  "http://localhost:5173"       // local
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ---------- BODY PARSER ----------
app.use(express.json());

// ---------- SESSION (CORRIGIDO PARA DEPLOY) ----------
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 7 * 24 * 60 * 60
    }),
    cookie: {
      httpOnly: true,
      secure: true,              
      sameSite: "none",          
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

// ---------- PASSPORT ----------
app.use(passport.initialize());
app.use(passport.session());

// ---------- ROTAS ----------
const adminRoutes = require("./src/routes/adminRoutes");
const progressRoutes = require("./src/routes/progressRoutes");

app.use("/admin", adminRoutes);
app.use("/api/progress", progressRoutes);

// ---------- GOOGLE AUTH ----------
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login/failed",
    session: true
  }),
  async (req, res) => {
    try {
      await LoginLog.create({
        userId: req.user._id,
        email: req.user.email
      });
    } catch (err) {
      console.error("Erro ao registrar login:", err);
    }

    res.redirect(process.env.CLIENT_URL);
  }
);

// ---------- LOGOUT ----------
app.get("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect(process.env.CLIENT_URL);
    });
  });
});

// ---------- USER ----------
app.get("/api/user/me", (req, res) => {
  if (req.user) return res.json({ success: true, user: req.user });
  res.status(401).json({ success: false, message: "Não autenticado" });
});

// ---------- MOCK ZUNZUNS ----------
const zunzuns = [{
  id: 1,
  author: "Google User",
  text: "Meu primeiro zunzum na Clubee!",
  date: new Date().toISOString(),
  likes: 5,
  isAnonymous: false
}];

app.get("/api/zunzuns", (req, res) => {
  const sorted = [...zunzuns].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(sorted);
});

const isAuthenticated = (req, res, next) => {
  if (req.user) return next();
  res.status(401).json({ success: false, message: "Não autorizado" });
};

app.post("/api/zunzuns", isAuthenticated, (req, res) => {
  const { text, isAnonymous } = req.body;

  if (!text || text.length > 280) {
    return res.status(400).json({ success: false, message: "Texto inválido (máx 280 caracteres)." });
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

// ROOT
app.get("/", (req, res) => {
  res.send("Clubee Backend is running.");
});

// SERVER
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});

module.exports = app;
