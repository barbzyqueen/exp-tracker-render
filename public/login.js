document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    const apiBaseUrl = 'https://www.webtechhobbyist.online/';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const authMsg = document.getElementById('auth-msg');

        try {
            // Making a POST request to the server with credentials included
            const response = await fetch(`${apiBaseUrl}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Ensures cookies (e.g., session cookie) are sent with the request
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            console.log('Response Data:', data); // Log the response data for debugging

            if (response.ok && data.userId) {
                // Store the userId in localStorage for later use
                localStorage.setItem('userId', data.userId);
                // Redirect to the homepage after successful login
                window.location.href = 'https://www.webtechhobbyist.online/index.html';
            } else {
                // Display an error message if login fails
                authMsg.textContent = `Login failed: ${data.message || 'Please check your credentials and try again.'}`;
                authMsg.style.color = 'red';
            }
        } catch (err) {
            // Display and log the error if an unexpected error occurs
            authMsg.textContent = `Error: ${err.message || 'An unexpected error occurred. Please try again.'}`;
            authMsg.style.color = 'red';
            console.log('Error:', err); // Log the error for debugging
        }
    });
});
