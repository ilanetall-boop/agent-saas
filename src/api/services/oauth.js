/**
 * OAuth Service
 * Handles OAuth authentication with Google and GitHub
 */

const https = require('https');
const querystring = require('querystring');

/**
 * Make HTTP request
 * @param {string} method - HTTP method
 * @param {string} hostname - Hostname
 * @param {string} path - Request path
 * @param {object} headers - Request headers
 * @param {string} body - Request body
 * @returns {Promise<object>}
 */
async function makeRequest(method, hostname, path, headers = {}, body = '') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname,
            port: 443,
            path,
            method,
            headers: {
                'User-Agent': 'MyBestAgent/1.0',
                ...headers
            }
        };
        
        if (body && method !== 'GET') {
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    // Sometimes responses aren't JSON
                    resolve({ raw: data, statusCode: res.statusCode });
                }
            });
        });
        
        req.on('error', reject);
        
        if (body && method !== 'GET') {
            req.write(body);
        }
        req.end();
    });
}

/**
 * Get Google OAuth authorization URL
 * @returns {string}
 */
function getGoogleAuthUrl() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
        throw new Error('Google OAuth not configured');
    }
    
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile email',
        access_type: 'offline',
        prompt: 'consent'
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange Google auth code for tokens
 * @param {string} code - Authorization code from Google
 * @returns {Promise<{accessToken: string, idToken: string, refreshToken?: string}>}
 */
async function exchangeGoogleCode(code) {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Google OAuth not configured');
    }
    
    const body = querystring.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
    });
    
    try {
        const response = await makeRequest(
            'POST',
            'oauth2.googleapis.com',
            '/token',
            { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        );
        
        if (response.error) {
            throw new Error(`Google OAuth error: ${response.error_description}`);
        }
        
        return {
            accessToken: response.access_token,
            idToken: response.id_token,
            refreshToken: response.refresh_token,
            expiresIn: response.expires_in
        };
    } catch (error) {
        console.error('[OAUTH] Google token exchange error:', error);
        throw error;
    }
}

/**
 * Verify and decode Google ID token
 * @param {string} idToken - ID token from Google
 * @returns {Promise<object>} - Token payload
 */
async function verifyGoogleIdToken(idToken) {
    try {
        const response = await makeRequest(
            'GET',
            'www.googleapis.com',
            `/oauth2/v3/tokeninfo?id_token=${idToken}`,
            {}
        );
        
        if (response.error) {
            throw new Error(`Google token verification failed: ${response.error_description}`);
        }
        
        return {
            sub: response.sub, // Google user ID
            email: response.email,
            name: response.name,
            picture: response.picture,
            email_verified: response.email_verified === 'true'
        };
    } catch (error) {
        console.error('[OAUTH] Google ID token verification error:', error);
        throw error;
    }
}

/**
 * Get GitHub OAuth authorization URL
 * @returns {string}
 */
function getGithubAuthUrl() {
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
        throw new Error('GitHub OAuth not configured');
    }
    
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'user:email',
        state: Math.random().toString(36).substring(7)
    });
    
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange GitHub auth code for access token
 * @param {string} code - Authorization code from GitHub
 * @returns {Promise<{accessToken: string}>}
 */
async function exchangeGithubCode(code) {
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
        throw new Error('GitHub OAuth not configured');
    }
    
    const body = JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
    });
    
    try {
        const response = await makeRequest(
            'POST',
            'github.com',
            '/login/oauth/access_token',
            { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body
        );
        
        if (response.error) {
            throw new Error(`GitHub OAuth error: ${response.error_description}`);
        }
        
        return {
            accessToken: response.access_token,
            scope: response.scope,
            tokenType: response.token_type
        };
    } catch (error) {
        console.error('[OAUTH] GitHub token exchange error:', error);
        throw error;
    }
}

/**
 * Get GitHub user info
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<{id: string, login: string, email: string, avatar_url: string, name: string}>}
 */
async function getGithubUserInfo(accessToken) {
    try {
        const response = await makeRequest(
            'GET',
            'api.github.com',
            '/user',
            {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        );
        
        if (response.error) {
            throw new Error(`GitHub user info error: ${response.message}`);
        }
        
        return {
            id: response.id.toString(),
            login: response.login,
            email: response.email,
            avatar_url: response.avatar_url,
            name: response.name
        };
    } catch (error) {
        console.error('[OAUTH] GitHub user info error:', error);
        throw error;
    }
}

/**
 * Get GitHub user emails
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<Array>} - List of email objects
 */
async function getGithubUserEmails(accessToken) {
    try {
        const response = await makeRequest(
            'GET',
            'api.github.com',
            '/user/emails',
            {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        );
        
        if (!Array.isArray(response)) {
            return [];
        }
        
        return response;
    } catch (error) {
        console.error('[OAUTH] GitHub emails error:', error);
        return [];
    }
}

module.exports = {
    // Google
    getGoogleAuthUrl,
    exchangeGoogleCode,
    verifyGoogleIdToken,
    
    // GitHub
    getGithubAuthUrl,
    exchangeGithubCode,
    getGithubUserInfo,
    getGithubUserEmails
};
