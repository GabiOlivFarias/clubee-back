require('dotenv').config(); // Garante que as variáveis sejam carregadas primeiro!
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
// No Vercel, use a porta que eles definem, ou 3001 localmente
const PORT = process.env.PORT || 3001; 

// --- CONFIGURAÇÃO DO CORS ---
app.use(cors({
    origin: process.env.CLIENT_URL, // Ex: http://localhost:5173 ou https://clubee-fullstack.vercel.app
    credentials: true
}));

// --- CONFIGURAÇÃO DA SESSÃO ---
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    // Em produção (Vercel) você DEVE usar secure: true
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    } 
}));

app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

// --- CONFIGURAÇÃO DO PASSPORT (Estratégia Google) ---
// A variável BACKEND_URL deve ser definida no Vercel como 'https://clubee-back.vercel.app'
const callbackUrl = process.env.BACKEND_URL ? 
    `${process.env.BACKEND_URL}/auth/google/callback` : 
    "/auth/google/callback";

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackUrl, 
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

// --- Rota de Verificação de Login e Rota Raiz (Vercel) ---
app.get('/api/user/me', (req, res) => {
    if (req.user) {
        res.json({ success: true, user: req.user });
    } else {
        res.status(401).json({ success: false, message: "Não autenticado" });
    }
});

// 💡 CORREÇÃO VERCEL: Rota padrão para / que evita o erro "Cannot GET /"
app.get('/', (req, res) => {
    res.send('Clubee Backend is running.');
});


// --- INICIAR O SERVIDOR ---

// Só inicia o listen se não estiver em ambiente de produção (Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🎉 Servidor backend rodando em http://localhost:${PORT}`);
    });
}


module.exports = app;
