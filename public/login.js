document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    const apiBaseUrl = 'https://www.webtechhobbyist.online';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted');
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const authMsg = document.getElementById('auth-msg');

        
        // Construct and log the login URL
        // const loginUrl = `${apiBaseUrl}/api/login`;
        // const loginUrl = `${apiBaseUrl}/api/login`.replace(/\/\//g, '/');
        // console.log(`Login URL: ${loginUrl}`); // Check the URL in the console
        
        // const loginUrl = `${apiBaseUrl}/api/login`.replace(/([^:]\/)\/+/g, "$1");
        // console.log(`Final Login URL: ${loginUrl}`); // Log the final URL to the console

        
        
            try {
            // const response = await fetch(loginUrl
            const response = await fetch('https://www.webtechhobbyist.online/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
        
            // Attempt to parse response as JSON
            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const textData = await response.text();
                throw new Error(`Unexpected response format: ${textData}`);
            }
        
            // Handle successful login
            if (response.ok && data.userId) {
                localStorage.setItem('userId', data.userId);
                window.location.href = 'https://www.webtechhobbyist.online/index.html';
            } else {
                authMsg.textContent = `Login failed: ${data.message || 'Please check your credentials and try again.'}`;
                authMsg.style.color = 'red';
            }
        } catch (err) {
            authMsg.textContent = `Error: ${err.message || 'An unexpected error occurred. Please try again.'}`;
            authMsg.style.color = 'red';
            console.log('Error:', err); // Log the error for debugging
        }

    });
});
