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

const apiBaseUrl = process.env.API_BASE_URL; // API base URL for internal use if needed

const { Pool } = require('pg');


// Database connection using Pool
const pool = new Pool({
    connectionString: process.env.DB_URL, // Use the environment variable for the database URL
});

// Test database connection and create tables
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err.stack);
        return;
    }
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
                    sess TEXT NOT NULL,
                    expire TIMESTAMPTZ NOT NULL
                )
            `);

            console.log("Tables created/checked");
        } catch (err) {
            console.error("Error creating tables:", err);
        }
    };

    createTables();
});



// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// CORS configuration
const allowedOrigins = [
    'https://webtechhobbyist.online', // Update with your frontend URL
    'https://www.webtechhobbyist.online',
    'https://exp-tracker-render-latest.onrender.com'
];

const corsOptions = {
    origin: allowedOrigins,
    methods: 'GET, POST, PUT, DELETE, OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true, // Allow cookies to be sent with requests
    preflightContinue: false // Ensure OPTIONS requests are handled correctly
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

app.use(cookieParser());

// Session store configuration
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'sessions'
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    rolling: true,
    resave: true,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true,
        // secure: process.env.NODE_ENV === 'production', // Ensure HTTPS in production
        // sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: true,
        sameSite: 'none',
        domain: process.env.NODE_ENV === 'production' ? '.webtechhobbyist.online' : undefined,
        // domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined,
        path: '/' // Ensure the cookie is accessible across the site
    }
}));

// Middleware to debug session
app.use((req, res, next) => {
    console.log('Session Data:', req.session);
    next();
});

// Test Session Route
app.get('/test-session', (req, res) => {
    if (req.session.views) {
        req.session.views++;
    } else {
        req.session.views = 1;
    }
    res.status(200).json({ message: 'Session is active', session: req.session });
});

// Logging middleware placed before all routes
app.use((req, res, next) => {
    console.log(`Request URL: ${req.originalUrl} | Method: ${req.method}`);
    res.on('finish', () => {
        if (res.statusCode === 301 || res.statusCode === 302) {
            console.log(`Redirect triggered: ${req.originalUrl} | Status Code: ${res.statusCode}`);
        }
    });
    next();
});

// Middleware to remove trailing slashes
// app.use((req, res, next) => {
//     if (req.url.endsWith('/') && req.url.length > 1) {
//         return res.redirect(301, req.url.slice(0, -1));
//     }
//     next();
// });



app.use((req, res, next) => {
    console.log('Session:', req.session);
    next();
});


// app.get('/api/current-user', authenticateUser, (req, res) => {
//     res.status(200).json(req.session.user);
// });

// app.get('/api/check-session', (req, res) => {
//     if (req.session.user) {
//         res.status(200).json({ authenticated: true });
//     } else {
//         res.status(401).json({ authenticated: false });
//     }
// });


// Serve static files from the 'public' directory without redirecting to a trailing slash
app.use(express.static(path.join(__dirname, 'public'), {
    redirect: false // Disable automatic trailing slash redirects
}));

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
        
        // Saving Session and handling response
        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).json("Session save error");
            }
            console.log('Session saved successfully:', req.session);
            res.status(200).json({ message: "Login successful", userId: users[0].id });
        });
    } catch (err) {
        console.log("Internal server error:", err);
        res.status(500).json("Internal Server Error");
    }
});

// Middleware to check if the user is authenticated
app.get('/api/current-user', authenticateUser, (req, res) => {
    res.status(200).json(req.session.user);
});

// app.get('/api/current-user', (req, res) => {
//     if (req.session.user) {
//         res.status(200).json({ username: req.session.user.username });
//         res.status(200).json(req.session.user);
//     } else {
//         res.status(401).json({ message: 'Not authenticated' });
//     }
// });

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
        res.status(400).json("Error deletingexpense");
    }
});

// Logout route
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log("Error logging out:", err);
            return res.status(500).json("Error logging out");
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.status(200).json("Logout successful");
    });
});

app.get('/api/check-session', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ loggedIn: true });
    } else {
        res.status(200).json({ loggedIn: false });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Server error:", err.stack);
    res.status(500).json("Internal Server Error");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
