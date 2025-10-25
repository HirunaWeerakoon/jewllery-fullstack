(function () {
    // API_BASE_URL should be defined in config.js (e.g., http://localhost:8081/api)
    const baseUrl = API_BASE_URL;
    const form = document.getElementById('adminRegisterForm');
    const errorEl = document.getElementById('registerError'); // Get error element
    if (!form || !errorEl) return;


    async function safePost(url, body) {
        const opts = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        };
        const res = await fetch(url, opts);
        const responseBody = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(responseBody.message || `Registration failed with status: ${res.status}`);
        }
        return responseBody;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.textContent = '';
        errorEl.style.display = 'none';

        const username = document.getElementById('regUsername').value.trim();
        const fullName = document.getElementById('regFullName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const submitBtn = form.querySelector('button[type="submit"]');

        if (!username || !fullName || !email || !password) {
            errorEl.textContent = 'All fields are required.';
            errorEl.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';

        try {
            const payload = {
                username: username,
                fullName: fullName,
                email: email,
                password: password,
                role: 'admin'
            };

            const registrationUrl = `${baseUrl}/admin-users/register`; // Corrected path
            console.log("Registering admin user at:", registrationUrl);
            console.log("Payload:", payload);

            const data = await safePost(registrationUrl, payload); // Use corrected URL

            console.log('Registration successful:', data);
            alert('Admin registration successful! You can now log in.');

            window.location.href = 'admin.html';

        } catch (err) {

            // Display the actual error message
            console.error('Registration failed:', err);
            errorEl.textContent = err.message || 'An unknown error occurred.';
            errorEl.style.display = 'block';

        } finally {
            // Re-enable button regardless of success/failure
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register';
        }
    });
})();