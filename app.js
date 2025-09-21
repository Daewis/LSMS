// app.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import session from 'express-session'; // Import express-session
import pgSession from 'connect-pg-simple'; // Import the PostgreSQL session store
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

import pool from './db.js'; // Your database pool connection
import UsersRoute from './routes/Users.js'; // For intern registration (and potentially other intern-specific actions)
import AuthRoute from './routes/auth.js'; // Handles admin/superadmin/intern login, logout, role check
import AdminRoute from './routes/admin.js'; // General admin functionalities (e.g., view interns, attendance)
import SuperadminRoute from './routes/superadmin.js'; // Superadmin specific actions (e.g., register admins)
import ForgotPasswordRoute from './routes/forgot_password.js';
import PendingApprovalRoute from './routes/pending_approval.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
//const PORT = process.env.PORT || 4000; // Use port from environment variable or default to 4000

// Middleware
app.use(cors()); // Enable CORS for cross-origin requests
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Serve static files from the 'public' directory
// This allows your HTML, CSS, client-side JS, and images to be served
app.use(express.static(path.join(__dirname, 'public')));

// Configure express-session with PostgreSQL store
const PgSession = pgSession(session); // Initialize connect-pg-simple

app.use(session({
    // Using connect-pg-simple to store sessions in your PostgreSQL database
    store: new PgSession({
        pool: pool,                 // Your PostgreSQL connection pool
        tableName: 'session'        // The table where session data will be stored
    }),
    secret: process.env.SESSION_SECRET, // **IMPORTANT: Use a strong, random key from environment variable in production**
    resave: false,                      // Don't save session if unmodified
    saveUninitialized: false,           // Don't create session until something stored
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        secure: process.env.NODE_ENV === 'production', // Set to true in production (requires HTTPS)
        httpOnly: true,                     // Prevent client-side JavaScript from accessing the cookie
        sameSite: 'Lax'                     // Protection against CSRF attacks. 'Lax' allows some cross-site requests.
    }
}));




// --- Route Handling ---
// Mount your routers to specific paths
app.use('/auth', AuthRoute); // Routes for authentication (login, logout, role check for all user types)
app.use('/users', UsersRoute); // Routes specifically for regular users (interns), e.g., registration
app.use('/api/admin', AdminRoute); // Routes for general admin functionalities
app.use('/api/superadmin', SuperadminRoute); // Routes for superadmin-specific actions
app.use('/forgot_password', ForgotPasswordRoute); // Forgot password routes
app.use('/pending_approval', PendingApprovalRoute); // Pending approval routes


// Route root to home.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

/*
app.get('/User_dashboard', (req, res) => {
  if (!req.session.user && !req.session.admin) {
    return res.redirect('/Sign_in.html');
  }
  res.sendFile(path.join(process.cwd(), 'public', 'User_dashboard.html'));
});
**/
 

// Start the server
app.listen(4000, '0.0.0.0', () => {
    console.log(`Server running on port 4000`);
});