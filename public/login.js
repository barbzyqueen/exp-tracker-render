document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const authMsg = document.getElementById('auth-msg');

        try {
            const response = await fetch('postgresql://barbara:t6QAgCVxwIjTB3DgBlZUBffz5bhremHw@dpg-cqs81rl6l47c73a129l0-a/expense_tracker_db_9g3g/api/login', { // Updated URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.userId) {
                localStorage.setItem('userId', data.userId);
                window.location.href = 'https://exp-tracker-render-latest.onrender.com/index.html'; // Redirect to the homepage after login
            } else {
                authMsg.textContent = `Login failed: ${data.message || 'Please check your credentials and try again.'}`;
                authMsg.style.color = 'red';
            }
        } catch (err) {
            authMsg.textContent = `Error: ${err.message || 'An unexpected error occurred. Please try again.'}`;
            authMsg.style.color = 'red';
        }
    });
});
