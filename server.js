const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const path = require('path');

dotenv.config();
const { Pool } = require('pg');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const allowedOrigins = [
    'https://exp-tracker-render-latest.onrender.com' // Update with your frontend URL
];

const corsOptions = {
    origin: allowedOrigins,
    methods: 'GET, POST, PUT, DELETE, OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true // Allow cookies to be sent with requests
};

app.use(cors(corsOptions));

// Database connection using Pool
const pool = new Pool({
    connectionString: process.env.DB_URL
});

// Test database connection and create tables
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err.stack);
        process.exit(1);  // Exit the process if the database connection fails
    } else {
        console.log('Connected to PostgreSQL:', res.rows[0]);

        const createTables = async () => {
            try {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        username VARCHAR(50) NOT NULL,
                        password VARCHAR(255) NOT NULL
                    )
                `);

                await pool.query(`
                    CREATE TABLE IF NOT EXISTS expenses (
                        id SERIAL PRIMARY KEY,
                        user_id INT REFERENCES users(id),
                        category VARCHAR(50),
                        amount DECIMAL(10, 2),
                        date DATE
                    )
                `);

                await pool.query(`
                    CREATE TABLE IF NOT EXISTS sessions (
                        sid VARCHAR PRIMARY KEY,
                        sess JSON NOT NULL,
                        expire TIMESTAMPTZ NOT NULL
                    )
                `);

                console.log("Tables created/checked");
            } catch (err) {
                console.error("Error creating tables:", err);
            }
        };

        createTables();
    }
});

// Session store configuration
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'sessions',
});

app.use(cookieParser());

const isProduction = process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true';

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 86400000, // 1 day
        httpOnly: true,
        secure: isProduction, // Only true if production and FORCE_HTTPS is true
        sameSite: isProduction ? 'None' : 'Lax',
        path: '/'
    }
}));

// Middleware to clear cookie if session doesn't exist
app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid', { path: '/' });
    }
    next();
});

// Middleware to debug session
app.use((req, res, next) => {
    console.log('Session Data:', req.session);
    next();
});

// Middleware to log session errors
app.use((req, res, next) => {
    if (!req.session) {
        console.error('Session not initialized');
        return next(new Error('Session initialization failed'));
    }
    next();
});

// Test Session Route
app.get('/test-session', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ message: 'Session is active', session: req.session });
    } else {
        res.status(401).json({ message: 'No active session' });
    }
});

// Routes for user registration, login, and expenses

// User registration route
app.post('/api/register', async (req, res) => {
    try {
        const { rows: existingUsers } = await pool.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
        if (existingUsers.length > 0) return res.status(409).json("User already exists");

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(req.body.password, salt);

        await pool.query('INSERT INTO users(email, username, password) VALUES($1, $2, $3)', [req.body.email, req.body.username, hashedPassword]);

        return res.status(200).json("User created successfully");
    } catch (err) {
        console.log("Internal server error:", err);
        res.status(500).json("Internal Server Error");
    }
});

// User login route
app.post('/api/login', async (req, res) => {
    try {
        const { rows: users } = await pool.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
        if (users.length === 0) return res.status(404).json("User not found");

        const isPasswordValid = bcrypt.compareSync(req.body.password, users[0].password);
        if (!isPasswordValid) return res.status(400).json("Invalid Email or Password");

        req.session.user = users[0];
        res.status(200).json({ message: "Login successful", userId: users[0].id });
    } catch (err) {
        console.log("Internal server error:", err);
        res.status(500).json("Internal Server Error");
    }
});

// Endpoint to get current user 
app.get('/api/current-user', (req, res) => {
    if (req.session.user) {
        console.log('Current User:', req.session.user); // Log current user for debugging
        res.status(200).json({ username: req.session.user.username });
    } else {
        console.log('No session user found');
        res.status(401).json({ message: 'Not authenticated' });
    }
});

// Middleware to check if the user is authenticated
function authenticateUser(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json("Unauthorized");
    }
    next();
}

// Route to add a new expense
app.post('/api/expenses', authenticateUser, async (req, res) => {
    const { category, amount, date } = req.body;
    const userId = req.session.user.id;

    try {
        await pool.query('INSERT INTO expenses (user_id, category, amount, date) VALUES ($1, $2, $3, $4)', [userId, category, amount, date]);
        res.status(201).json("Expense added successfully");
    } catch (err) {
        console.log("Error adding expense:", err);
        res.status(400).json("Error adding expense");
    }
});

// Route to get all expenses for the authenticated user
app.get('/api/expenses', authenticateUser, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const { rows: expenses } = await pool.query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC', [userId]);
        res.status(200).json(expenses);
    } catch (err) {
        console.log("Error retrieving expenses:", err);
        res.status(400).json("Error retrieving expenses");
    }
});

// Route to update an existing expense
app.put('/api/expenses/:id', authenticateUser, async (req, res) => {
    const expenseId = req.params.id;
    const { category, amount, date } = req.body;
    const userId = req.session.user.id;

    try {
        const result = await pool.query('UPDATE expenses SET category = $1, amount = $2, date = $3 WHERE id = $4 AND user_id = $5', [category, amount, date, expenseId, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json("Expense not found or not authorized");
        }
        res.status(200).json("Expense updated successfully");
    } catch (err) {
        console.log("Error updating expense:", err);
        res.status(400).json("Error updating expense");
    }
});

// Route to delete an existing expense
app.delete('/api/expenses/:id', authenticateUser, async (req, res) => {
    const expenseId = req.params.id;
    const userId = req.session.user.id;

    try {
        const result = await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [expenseId, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json("Expense not found or not authorized");
        }
        res.status(200).json("Expense deleted successfully");
    } catch (err) {
        console.log("Error deleting expense:", err);
        res.status(400).json("Error deleting expense");
    }
});

// Logout route
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log("Error logging out:", err);
            return res.status(500).json("Error logging out");
        }
        res.clearCookie('user_sid', { path: '/' });
        res.status(200).json("Logout successful");
    });
});

// Route to check```javascript
// Route to check if the server is running
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error caught by middleware:', err.stack || err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// Static file serving for frontend
app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
});

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
