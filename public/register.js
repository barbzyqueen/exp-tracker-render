document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const authMsg = document.getElementById('auth-msg');

        if (!email || !username || !password) {
            authMsg.textContent = 'Please fill in all fields';
            authMsg.style.color = 'red';
            return;
        }

        try {
            authMsg.textContent = 'Registering...';
            authMsg.style.color = 'blue';

            const response = await fetch('postgresql://barbara:t6QAgCVxwIjTB3DgBlZUBffz5bhremHw@dpg-cqs81rl6l47c73a129l0-a/expense_tracker_db_9g3g/expense_tracker_db_9g3g/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, username, password })
            });

            console.log('Response:', response);

            const data = await response.json();
            console.log('Data:', data);

            if (!response.ok) {
                if (response.status === 409) {
                    authMsg.textContent = 'User already exists. Please log in.';
                } else if (response.status >= 500) {
                    authMsg.textContent = 'Server error. Please try again later.';
                } else {
                    authMsg.textContent = `Error: ${data}`;
                }
                authMsg.style.color = 'red';
            } else {
                authMsg.textContent = 'Registration successful! Redirecting to login page...';
                authMsg.style.color = 'green';
                form.reset();
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000); // Redirect after 2 seconds
            }
        } catch (err) {
            console.error('Fetch error:', err);
            authMsg.textContent = `Error: ${err}`;
            authMsg.style.color = 'red';
        }
    });
});
