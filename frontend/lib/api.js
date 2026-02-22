const API_URL = 'http://127.0.0.1:8000/api';
// Register new user

export async function register(userData) {
    const response = await fetch(`${API_URL}/auth/register/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
    }
    return data;
}

// Login user..
export async function login(credentials) {
    const resposne = await fetch(`${API_URL}/auth/login/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });

    const data = await resposne.json();

    if (!resposne.ok) {
        throw new Error(data.error || 'Login failed!')
    }
    return data
}

// Get current use details
export async function getCurrentUser(accessToken) {
    const response = await fetch(`${API_URL}/auth/me/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error || 'Failed to get user')
    }
    return data
}

export async function refreshAccessToken(refreshToken) {
    const response = await fetch(`${API_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken })
    });
    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error || 'Token refresh failed');
    }
    return data
}