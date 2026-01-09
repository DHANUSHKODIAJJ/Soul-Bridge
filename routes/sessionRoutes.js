const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// In-memory store
const sessions = {};

// POST /create-session
router.post('/create-session', (req, res) => {
    try {
        const { name, message } = req.body;
        if (!name || !message) {
            return res.status(400).json({ error: 'Name and message are required' });
        }

        const sessionId = uuidv4();
        sessions[sessionId] = {
            id: sessionId,
            userA: { name, message },
            userB: null,
            status: 'waiting_for_b', // waiting_for_b, processing, completed
            result: null,
            createdAt: Date.now()
        };

        res.json({ sessionId });
    } catch (error) {
        console.error("Error creating session:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /join-session
router.post('/join-session', async (req, res) => {
    try {
        const { sessionId, name, message } = req.body;

        if (!sessions[sessionId]) {
            return res.status(404).json({ error: 'Session not found' });
        }
        if (sessions[sessionId].userB) {
            return res.status(400).json({ error: 'Session already full' });
        }

        sessions[sessionId].userB = { name, message };
        sessions[sessionId].status = 'processing';

        // Trigger AI processing immediately (or could be separate, but requirement says "When both users submitted... Send to OpenAI")
        // We will do it async and update state, or await it if fast enough. 
        // For better UX, we await it so we can confirm it's done, or client polls.
        // Let's do await for simplicity as requested.

        await processMediation(sessionId);

        res.json({ success: true });

    } catch (error) {
        console.error("Error joining session:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /session/:id
router.get('/session/:id', (req, res) => {
    const { id } = req.params;
    const session = sessions[id];

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    // Return safe data (maybe hide raw messages if privacy needed, but requirement implies showing result)
    // Requirement 5: Show User A name & feeling, User B name & feeling, AI solution.
    // We will send back the result if available.

    res.json({
        status: session.status,
        userA: session.userA ? { name: session.userA.name } : null,
        userB: session.userB ? { name: session.userB.name } : null,
        result: session.result
    });
});

async function processMediation(sessionId) {
    const session = sessions[sessionId];
    if (!session || !session.userA || !session.userB) return;

    try {
        const prompt = `
Act as a neutral mediator.
Analyze both sides.

User A ("${session.userA.name}") says: "${session.userA.message}"
User B ("${session.userB.name}") says: "${session.userB.message}"

Explain feelings of both users.
Give soft solution.
Do not blame anyone.
Use simple language.

Format response as JSON:
{
  "userA_feeling": "...",
  "userB_feeling": "...",
  "solution": "..."
}
`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: "You are a helpful conflict mediator." }, { role: "user", content: prompt }],
            model: "gpt-3.5-turbo", // Cheap model as requested
            response_format: { type: "json_object" }, // Ensure JSON output
            max_tokens: 500,
        });

        const content = JSON.parse(completion.choices[0].message.content);

        session.result = content;
        session.status = 'completed';

    } catch (error) {
        console.error("Check OpenAI API Key or quota.", error);
        session.status = 'error';
        session.result = { error: "Failed to process mediation. Please try again later." };
    }
}

module.exports = router;
