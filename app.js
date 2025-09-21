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


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (Vercel will also serve /public natively)
app.use(express.static(path.join(__dirname, 'public')));

// Configure session with PostgreSQL store
const PgSession = pgSession(session);

app.use(session({
    store: new PgSession({
        pool: pool,
        tableName: 'session',
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'Lax',
    },
}));

// Only route API requests through Express routers
app.use('/auth', AuthRoute);
app.use('/users', UsersRoute);
app.use('/api/admin', AdminRoute);
app.use('/api/superadmin', SuperadminRoute);
app.use('/forgot_password', ForgotPasswordRoute);
app.use('/pending_approval', PendingApprovalRoute);

// Remove any routes serving HTML files like /sign_in.html or /sign_up.html
// Let Vercel serve these static files from `/public` folder automatically

// Handle 404s for API routes:
app.use((req, res, next) => {
    res.status(404).json({ success: false, message: 'The requested API endpoint was not found.' });
});

// Export app for serverless handling
export default app;
