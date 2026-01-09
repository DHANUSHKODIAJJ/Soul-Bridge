const API_URL = '/api';

// Mobile Navigation Toggle
function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    const hamburger = document.querySelector('.hamburger');

    navLinks.classList.toggle('active');
    hamburger.classList.toggle('toggle');
}

// Close menu when a link is clicked or outside click
document.addEventListener('click', (e) => {
    const navLinks = document.getElementById('nav-links');
    const hamburger = document.querySelector('.hamburger');

    if (navLinks.classList.contains('active')) {
        // If clicking outside nav and hamburger
        if (!e.target.closest('nav')) {
            navLinks.classList.remove('active');
            hamburger.classList.remove('toggle');
        }
        // If clicking a link inside nav
        if (e.target.tagName === 'A' && e.target.closest('#nav-links')) {
            navLinks.classList.remove('active');
            hamburger.classList.remove('toggle');
        }
    }
});

// Love Quote Feature
async function fetchLoveQuote() {
    const quoteEl = document.getElementById('daily-quote');
    if (!quoteEl) return;

    const url = 'https://love-quote.p.rapidapi.com/lovequote';
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-host': 'love-quote.p.rapidapi.com',
            'x-rapidapi-key': 'dd5ab8c452msh042fff40c0853f8p1037abjsnb365a7edd5ce' // User: Please replace with your actual key
        }
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('API Error');
        const result = await response.json(); // Assuming JSON, though user snippet said .text() - let's try JSON first as snippets are often generic.
        // Actually user snippet said .text(), let's stick to .json() if we expect a quote object, or .text() if string.
        // RapidAPI usually returns JSON. Let's try to parse it safely.

        // If result is { "quote": "..." } or similar
        quoteEl.innerText = `"${result.quote || result.content || result}"`;
    } catch (error) {
        console.error(error);
        quoteEl.innerText = "\"Love is the bridge between two hearts.\""; // Fallback quote
    }
}

// Loader Functions
function showLoader() {
    const overlay = document.getElementById('loader-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideLoader() {
    const overlay = document.getElementById('loader-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Call on load
document.addEventListener('DOMContentLoaded', fetchLoveQuote);

async function createSession() {
    const name = document.getElementById('name').value;
    const message = document.getElementById('message').value;
    const btn = document.getElementById('create-btn');

    if (!name || !message) {
        alert("Please fill in all fields");
        return;
    }

    // btn.disabled = true; // No need to disable if we show full screen loader
    showLoader();

    try {
        const response = await fetch(`${API_URL}/create-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, message })
        });

        const data = await response.json();
        hideLoader();

        if (data.sessionId) {
            document.getElementById('create-form-container').style.display = 'none';
            document.getElementById('share-container').style.display = 'block';

            const link = `${window.location.origin}/join.html?session=${data.sessionId}`;
            const linkEl = document.getElementById('invite-link');
            linkEl.href = link;
            linkEl.textContent = link;

            // Start polling for completion (or just redirect User A to result page immediately to wait there)
            // It's better to redirect User A to result page, which will poll until B joins and finishes.
            setTimeout(() => {
                window.location.href = `/result.html?session=${data.sessionId}`;
            }, 9000); // Give them 5 seconds to copy the link, or maybe just provide a button "Go to Waiting Room"

            // Actually, let's change the "Redirecting..." text to a button or just let it auto redirect logic be handled better.
            // For this prototype, I'll alert them to copy the link.
            alert("Session Created! Copy the link before you leave.");
        } else {
            alert("Error: " + data.error);
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert("Something went wrong");
        btn.disabled = false;
    }
}

async function joinSession(sessionId) {
    const name = document.getElementById('name').value;
    const message = document.getElementById('message').value;
    const btn = document.getElementById('join-btn');

    if (!name || !message) {
        alert("Please fill in all fields");
        return;
    }

    showLoader();

    try {
        const response = await fetch(`${API_URL}/join-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, name, message })
        });

        const data = await response.json();
        // Don't hide loader here if redirecting? Actually better to keep showing it until redirect happens

        if (data.success) {
            window.location.href = `/result.html?session=${sessionId}`;
        } else {
            hideLoader();
            alert("Error: " + data.error);
        }
    } catch (e) {
        hideLoader();
        console.error(e);
        alert("Something went wrong");
    }
}

async function pollResult(sessionId) {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`${API_URL}/session/${sessionId}`);
            const data = await response.json();

            if (data.status === 'completed' && data.result) {
                clearInterval(interval);
                renderResult(data);
            } else if (data.status === 'processing') {
                document.getElementById('loading-state').innerHTML = "<p>User B Joined. Analyzing...</p>";
            } else if (data.status === 'waiting_for_yoursoulmate') {
                document.getElementById('loading-state').innerHTML = "<p>Waiting for User B to join...</p>";
            } else if (data.status === 'error') {
                clearInterval(interval);
                document.getElementById('loading-state').innerHTML = "<p style='color:red;'>An error occurred during analysis.</p>";
            }
        } catch (e) {
            console.error(e);
        }
    }, 2000); // Poll every 2 seconds
}

function renderResult(data) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('results-container').style.display = 'block';

    document.getElementById('user-a-name').textContent = data.userA.name;
    document.getElementById('user-a-feeling').textContent = data.result.userA_feeling;

    document.getElementById('user-b-name').textContent = data.userB.name;
    document.getElementById('user-b-feeling').textContent = data.result.userB_feeling;

    document.getElementById('solution-text').textContent = data.result.solution;
}

// About Modal Logic
document.addEventListener('DOMContentLoaded', () => {
    const aboutLink = document.getElementById('about-link');
    const modal = document.getElementById('about-modal');
    const closeBtn = document.querySelector('.close-btn');

    if (aboutLink && modal && closeBtn) {
        aboutLink.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default anchor 'jump'
            modal.style.display = 'flex';
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
});

// Timeline Scroll Animation
document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });

    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => {
        observer.observe(item);
    });
});

// Heart Trail Animation
document.addEventListener('mousemove', (e) => {
    // Throttle: Create heart every few frames or pixels
    // Check if mouse is down or just moving? User said "when mouse behide heart train is follow" -> likely just moving.
    // Simple random check to avoid too many hearts
    if (Math.random() > 0.85) {
        createHeart(e.clientX, e.clientY);
    }
});

function createHeart(x, y) {
    const heart = document.createElement('div');
    heart.classList.add('heart-trail');

    // Randomize movement
    const tx = (Math.random() - 0.5) * 100; // Move left/right
    const ty = (Math.random() - 1) * 100;   // Move up
    const r = (Math.random() - 0.5) * 45;   // Rotate

    heart.style.left = `${x}px`;
    heart.style.top = `${y}px`;
    heart.style.setProperty('--tx', `${tx}px`);
    heart.style.setProperty('--ty', `${ty}px`);
    heart.style.setProperty('--r', `${r}deg`);

    document.body.appendChild(heart);

    // Remove after animation
    setTimeout(() => {
        heart.remove();
    }, 1000);
}

