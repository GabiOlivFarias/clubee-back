require('dotenv').config(); // Carrega as chaves secretas do arquivo .env
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const PORT = 3001;

// --- CONFIGURAÇÃO DO CORS (Permite cookies e o frontend) ---
app.use(cors({
    origin: process.env.CLIENT_URL, // http://localhost:5173
    credentials: true
}));

// --- CONFIGURAÇÃO DA SESSÃO ---
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, sameSite: 'lax' } 
}));

app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());


// --- CONFIGURAÇÃO DO PASSPORT (Estratégia Google) ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    //callbackURL: "/auth/google/callback",
    callbackURL: `${process.env.BACKEND_URL || ''}/auth/google/callback`, 
    proxy: true 
},
    function(accessToken, refreshToken, profile, cb) {
return cb(null, profile);
}
));

passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});


// --- ROTAS DE AUTENTICAÇÃO ---
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { 
    successRedirect: process.env.CLIENT_URL,
    failureRedirect: `${process.env.CLIENT_URL}/login/failed`
})
);

app.get('/auth/logout', (req, res, next) => {
    req.logout(function(err) {
    if (err) { return next(err); }
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect(process.env.CLIENT_URL);
    });
});
});

// --- ROTAS DA API ---
app.get('/api/user/me', (req, res) => {
    if (req.user) {
        res.json({ success: true, user: req.user });
    } else {
        res.status(401).json({ success: false, message: "Não autenticado" });
    }
});


// --- INICIAR O SERVIDOR ---
app.listen(PORT, () => {
    console.log(`🎉 Servidor backend rodando em http://localhost:${PORT}`);
});
