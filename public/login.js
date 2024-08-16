form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const authMsg = document.getElementById('auth-msg');

    console.log('Email:', email); // Debugging: Check email value
    console.log('Password:', password); // Debugging: Check password value

    try {
        const response = await fetch('/api/login', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        console.log('Response Data:', data); // Debugging: Check response data

        if (response.ok && data.userId) {
            localStorage.setItem('userId', data.userId);
            window.location.href = 'https://exp-tracker-render-latest.onrender.com/index.html'; 
        } else {
            authMsg.textContent = `Login failed: ${data.message || 'Please check your credentials and try again.'}`;
            authMsg.style.color = 'red';
        }
    } catch (err) {
        authMsg.textContent = `Error: ${err.message || 'An unexpected error occurred. Please try again.'}`;
        authMsg.style.color = 'red';
        console.log('Error:', err); // Debugging: Check any caught errors
    }
});
