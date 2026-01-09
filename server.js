const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const sessionRoutes = require('./routes/sessionRoutes');
app.use('/api', sessionRoutes);

// Fallback to index.html for SPA-like feel (optional, but good for direct links if I were using client-router, here just static serving)
// Actually, I have specific HTML files for join and result, so default static serving is fine.
// But I should handle the case where user visits the root.

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
