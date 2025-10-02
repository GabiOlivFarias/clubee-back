require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MemoryStore = require('express-session').MemoryStore; 

const registeredUsers = []; 
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

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001; 
const sessionStore = new MemoryStore(); 
// --- CONFIGURAÇÃO DO CORS ---
app.use(cors({
    origin: process.env.CLIENT_URL, 
    //origin: 'http://localhost:5173',
    credentials: true
    }));
    

/*
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173'; 

app.use(cors({
    origin: allowedOrigin, 
    credentials: true
}));
*/
// antes de subri pra produção retirar o trecho desde const allowedOrigin até o final da função app.use(cors)

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: sessionStore, 
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    } 
}));

app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

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
         let user = registeredUsers.find(u => u.id === profile.id);
         if (!user) {
             user = {
                 id: profile.id,
                 displayName: profile.displayName,
             };
             registeredUsers.push(user);
             console.log(`✅ Novo usuário registrado: ${user.displayName}`);
         } else {
             console.log(`👤 Usuário já registrado: ${user.displayName}`);
         }
        return cb(null, profile);
    }
));

passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});

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

app.get('/api/user/me', (req, res) => {
    if (req.user) {
        res.json({ success: true, user: req.user });
    } else {
        res.status(401).json({ success: false, message: "Não autenticado" });
    }
});

app.get('/', (req, res) => {
    res.send('Clubee Backend is running.');
});

// TESTE ZUMZUM
const isAuthenticated = (req, res, next) => {
    if (req.user) {
        next(); 
    } else {
        res.status(401).json({ success: false, message: "Não autorizado" });
    }
};

app.get('/api/zunzuns', (req, res) => {
    const sortedZunzuns = [...zunzuns].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(sortedZunzuns);
});

app.get('/api/users', isAuthenticated, (req, res) => {
    const userList = registeredUsers.map(u => ({
        id: u.id,
        displayName: u.displayName
    }));
    res.json({ success: true, users: userList });
});

app.post('/api/zunzuns', isAuthenticated, (req, res) => {
    const { text, isAnonymous } = req.body;
    
    if (!text || text.length > 280) {
        return res.status(400).json({ success: false, message: "Texto do zunzum inválido (máx 280 caracteres)." });
    }
    
    const authorName = isAnonymous
        ? "Abelha Anônima 🤫" // Apelido para posts anônimos
        : req.user.displayName; // Nome real

    const newZunzum = {
        id: Date.now(),
        author: authorName,
        text: text,
        date: new Date().toISOString(),
        likes: 0,
        isAnonymous: !!isAnonymous // Garante que é booleano
    };

    zunzuns.push(newZunzum);
    console.log(`Novo Zunzum de ${newZunzum.author} (Anônimo: ${newZunzum.isAnonymous}): ${newZunzum.text}`);

    res.status(201).json({ success: true, zunzum: newZunzum });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🎉 Servidor backend rodando em http://localhost:${PORT}`);
    });
}


module.exports = app;
