// app.js 
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

import pool from './db.js';
import UsersRoute from './routes/Users.js';
import AuthRoute from './routes/auth.js';
import AdminRoute from './routes/admin.js';
import SuperadminRoute from './routes/superadmin.js';
import ForgotPasswordRoute from './routes/forgot_password.js';
import PendingApprovalRoute from './routes/pending_approval.js';
import MailRoute from './routes/mail.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ===== CRITICAL FIXES FOR VERCEL =====

// Updated CORS configuration for single-domain deployment
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:4000',
    'https://lisms.vercel.app',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.FRONTEND_URL
].filter((origin, index, array) => 
    origin && array.indexOf(origin) === index // Remove duplicates and nulls
);

app.use(cors({
    origin: function (origin, callback) {
        console.log('CORS Check - Origin:', origin);
        console.log('Allowed Origins:', allowedOrigins);
        
        // Allow requests with no origin (same-origin requests)
        if (!origin) {
            console.log('No origin - allowing same-origin request');
            return callback(null, true);
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            console.log('Origin allowed:', origin);
            callback(null, true);
        } else {
            console.warn('CORS blocked origin:', origin);
            // In production with single domain, this shouldn't happen often
            callback(null, true); // Allow for now, change to false if needed
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
}));

/*
// Debug session store operations
app.use((req, res, next) => {
    if (req.session) {
        const originalSave = req.session.save;
        req.session.save = function(callback) {
            console.log('[SESSION SAVE] Attempting to save session:', this);
            return originalSave.call(this, (err) => {
                if (err) {
                    console.error('[SESSION SAVE ERROR]', err);
                } else {
                    console.log('[SESSION SAVE SUCCESS] Session saved to database');
                }
                if (callback) callback(err);
            });
        };
    }
    next();
});
**/

// 3. Body parser middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 4. Static files


// 5. Enhanced session configuration for Vercel
const PgSession = pgSession(session);

app.set('trust proxy', 1);

app.use(session({
    store: new PgSession({
        pool: pool,
        tableName: 'session',
        errorLog: console.error,
        ttl: 24 * 60 * 60
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
       // sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // CRITICAL CHANGE
       sameSite:'lax'
    }
}));

app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'development') { // Fix the condition
        console.log('Session Debug:', {
            sessionID: req.sessionID,
            hasSession: !!req.session,
            cookies: req.headers.cookie,
            user: req.session?.user?.email || 'none',
            userRole: req.session?.user?.role || 'none',
            sessionKeys: req.session ? Object.keys(req.session) : []
        });
    }
    next();
});
// ===== AUTHENTICATION MIDDLEWARE =====



// Enhanced authentication middleware
function isAuthenticated(req, res, next) {
    console.log('Auth check - Session user:', req.session?.user?.email || 'none');
    
    if (!req.session?.user) {
        console.log('Authentication failed - no session user');
        return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated.',
            debug: process.env.NODE_ENV !== 'development' ? {
                sessionID: req.sessionID,
                hasSession: !!req.session,
                sessionKeys: req.session ? Object.keys(req.session) : []
            } : undefined
        });
    }
    next();
}

// Enhanced admin check middleware
function isAdminOrSuperadmin(req, res, next) {
    const userRole = req.session?.user?.role;
    console.log('Admin check - User role:', userRole);
    
    if (userRole === 'admin' || userRole === 'superadmin') {
        next();
    } else {
        console.log('Admin access denied - insufficient role:', userRole);
        res.status(403).json({ 
            success: false, 
            message: 'Access denied: Admin privileges required.',
            debug: process.env.NODE_ENV !== 'development' ? {
                currentRole: userRole,
                requiredRoles: ['admin', 'superadmin']
            } : undefined
        });
    }
}

// ===== ROUTES =====

// API Routes
app.use('/auth', AuthRoute);
app.use('/users', UsersRoute);
app.use('/api/admin', AdminRoute);
app.use('/api/superadmin', SuperadminRoute);
app.use('/forgot_password', ForgotPasswordRoute);
app.use('/pending_approval', PendingApprovalRoute);
app.use('/mail', MailRoute);

// ===== PAGE ROUTES =====

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});


// User dashboard route with enhanced authentication
app.get('/User_dashboard.html', isAuthenticated, (req, res) => {
    console.log('User dashboard access - User:', req.session.user?.email);
    
    // Double-check authentication
    if (!req.session?.user || req.session.user.role !== 'intern') {
        console.log('User dashboard access denied');
        return res.redirect('/Sign_in.html');
    }
    
    res.sendFile(path.join(process.cwd(), 'public', 'User_dashboard.html'));
});

// Admin dashboard route with enhanced authentication
app.get('/Admin_dashboard.html', isAuthenticated, isAdminOrSuperadmin, (req, res) => {
    console.log('Admin dashboard access - User:', req.session.user?.email, 'Role:', req.session.user?.role);
    
    // Double-check authentication and role
    const userRole = req.session?.user?.role;
    if (!req.session?.user || (userRole !== 'admin' && userRole !== 'superadmin')) {
        console.log('Admin dashboard access denied');
        return res.redirect('/Sign_in.html');
    }
    
    res.sendFile(path.join(process.cwd(), 'public', 'Admin_dashboard.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// ===== HEALTH CHECK ROUTE =====
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        session: {
            hasUser: !!req.session?.user,
            userEmail: req.session?.user?.email || 'none',
            sessionID: req.sessionID
        }
    });
});

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    console.log('404 - Not found:', req.path);
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path
    });
});

// ===== SERVER STARTUP =====
const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Allowed origins:', allowedOrigins);
});