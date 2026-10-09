const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// ── PKCE Helper Functions (RFC 7636) ──────────────────────────────────────────

/**
 * Base64-URL encode a buffer (RFC 7636 Section 3)
 */
function base64URLEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a cryptographically random code_verifier (32 random bytes -> 43 base64url characters)
 */
function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}

/**
 * Generate code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
 */
function generateCodeChallenge(verifier) {
  return base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
}

/**
 * Generate cryptographically secure state parameter to prevent CSRF
 */
function generateState() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Helper to resolve frontend origin securely
 */
function resolveFrontendOrigin(req) {
  if (req.query && req.query.origin) {
    try {
      const parsed = new URL(req.query.origin);
      return parsed.origin;
    } catch {
      // Fallback
    }
  }

  if (req.headers && req.headers.referer) {
    try {
      const parsed = new URL(req.headers.referer);
      return parsed.origin;
    } catch {
      // Fallback
    }
  }

  return process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173';
}

/**
 * Helper to resolve backend callback URL
 */
function resolveCallbackUrl(req) {
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}/api/auth/google/callback`;
}

// ── Google OAuth Controllers ──────────────────────────────────────────────────

/**
 * GET /api/auth/google/status
 * Check if Google OAuth credentials are configured on the backend
 */
const getGoogleAuthStatus = (req, res) => {
  const configured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_ID.trim() !== '' &&
    process.env.GOOGLE_CLIENT_SECRET.trim() !== '' &&
    !process.env.GOOGLE_CLIENT_ID.includes('replace_this')
  );

  res.json({
    success: true,
    configured,
  });
};

/**
 * GET /api/auth/google
 * Initiates the Google OAuth 2.0 Authorization Code flow with PKCE
 */
const initiateGoogleAuth = (req, res) => {
  const clientOrigin = resolveFrontendOrigin(req);
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  // If credentials are not configured, redirect back to login with a user-friendly error
  if (!clientId || !clientSecret || clientId.includes('replace_this')) {
    console.warn('⚠️ [OAuth] Google Client ID or Secret is not configured in backend/.env');
    return res.redirect(`${clientOrigin.replace(/\/$/, '')}/login?error=google_not_configured`);
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  const callbackUrl = resolveCallbackUrl(req);

  // Store state, code_verifier, and clientOrigin in an HTTP-only secure cookie
  const cookiePayload = JSON.stringify({
    state,
    codeVerifier,
    clientOrigin,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('rr_oauth_pkce', cookiePayload, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
    signed: Boolean(process.env.JWT_SECRET),
  });

  // Construct Google OAuth 2.0 URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('code_challenge', codeChallenge);
  googleAuthUrl.searchParams.set('code_challenge_method', 'S256');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'online');
  googleAuthUrl.searchParams.set('prompt', 'select_account');

  res.redirect(googleAuthUrl.toString());
};

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth redirect, validates PKCE + state, exchanges code for tokens,
 * verifies Google identity token & OpenID userinfo, links/creates customer user, and sets JWT.
 */
const handleGoogleCallback = async (req, res) => {
  // Read stored cookie data
  let cookieData = null;
  const rawCookie = (req.signedCookies && req.signedCookies.rr_oauth_pkce) ||
                    (req.cookies && req.cookies.rr_oauth_pkce);

  if (rawCookie) {
    try {
      cookieData = typeof rawCookie === 'string' ? JSON.parse(rawCookie) : rawCookie;
    } catch {
      cookieData = null;
    }
  }

  const clientOrigin = (cookieData && cookieData.clientOrigin) ||
                       process.env.FRONTEND_URL ||
                       process.env.CLIENT_ORIGIN ||
                       'http://localhost:5173';

  const redirectWithError = (errCode) => {
    res.clearCookie('rr_oauth_pkce');
    return res.redirect(`${clientOrigin.replace(/\/$/, '')}/login?error=${encodeURIComponent(errCode)}`);
  };

  // Check for Google OAuth authorization errors
  if (req.query.error) {
    console.warn(`⚠️ [OAuth] Google returned error: ${req.query.error}`);
    if (req.query.error === 'access_denied') {
      return redirectWithError('cancelled');
    }
    return redirectWithError('google_auth_failed');
  }

  const { code, state } = req.query;

  if (!code || !state) {
    return redirectWithError('missing_code_or_state');
  }

  // Validate state against stored PKCE cookie
  if (!cookieData || !cookieData.state || cookieData.state !== state) {
    console.error('❌ [OAuth] State mismatch or expired session cookie');
    return redirectWithError('invalid_state');
  }

  const { codeVerifier } = cookieData;
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const callbackUrl = resolveCallbackUrl(req);

  try {
    // 1. Exchange authorization code + code_verifier for Google tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('❌ [OAuth] Token exchange failed:', tokenData);
      return redirectWithError('token_exchange_failed');
    }

    // 2. Validate identity using Google's OpenID Connect UserInfo & TokenInfo
    let googleUser = null;

    if (tokenData.id_token) {
      // Validate the ID token with Google's tokeninfo endpoint to verify audience and signature
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`
      );
      if (tokenInfoRes.ok) {
        const tokenInfo = await tokenInfoRes.json();
        // Exact aud check against our client ID
        if (tokenInfo.aud !== clientId) {
          console.error('❌ [OAuth] ID token aud mismatch:', tokenInfo.aud, 'expected:', clientId);
          return redirectWithError('token_validation_failed');
        }
        googleUser = tokenInfo;
      }
    }

    // Also fetch standard OpenID Connect userinfo for profile fields
    const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      googleUser = { ...googleUser, ...userInfo };
    }

    if (!googleUser || !googleUser.sub || !googleUser.email) {
      console.error('❌ [OAuth] Failed to obtain valid user profile from Google');
      return redirectWithError('profile_fetch_failed');
    }

    // Verify email is verified by Google
    const isEmailVerified =
      googleUser.email_verified === true || googleUser.email_verified === 'true';
    if (!isEmailVerified) {
      console.warn('⚠️ [OAuth] Google account email is not verified:', googleUser.email);
      return redirectWithError('unverified_email');
    }

    const googleId = googleUser.sub;
    const googleEmail = googleUser.email.toLowerCase().trim();
    const googleName = (googleUser.name || googleEmail.split('@')[0]).trim();
    const googlePicture = googleUser.picture || '';

    // 3. User Resolution in MongoDB
    // Check if user already exists with this googleId
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if existing user has the same verified email
      user = await User.findOne({ email: googleEmail });

      if (user) {
        // Link Google ID safely to existing user account.
        // SECURITY: Never alter the user's role! Admin and staff roles must remain intact.
        user.googleId = googleId;
        user.authProvider = user.authProvider === 'local' ? 'local' : 'google';
        if (!user.avatar && googlePicture) {
          user.avatar = googlePicture;
        }
        await user.save();
        console.log(`🔗 [OAuth] Linked Google ID to existing account (${user.username}, role: ${user.role})`);
      } else {
        // Create a new RoadReady customer account
        // Generate a valid, unique username conforming to /^[a-zA-Z0-9_]+$/
        let baseUsername = (googleEmail.split('@')[0] || 'user')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .slice(0, 20);

        if (baseUsername.length < 3) {
          baseUsername = `user_${baseUsername}`.slice(0, 20);
        }

        let username = baseUsername;
        let counter = 1;
        while (await User.findOne({ username })) {
          username = `${baseUsername.slice(0, 20 - String(counter).length)}${counter}`;
          counter++;
        }

        // Customer role is strictly enforced for new OAuth signups
        user = await User.create({
          username,
          name: googleName,
          email: googleEmail,
          role: 'customer',
          authProvider: 'google',
          googleId,
          avatar: googlePicture,
          active: true,
          password: null,
        });

        console.log(`✨ [OAuth] Created new RoadReady customer user (${user.username})`);
      }
    } else {
      // User with googleId already exists
      if (!user.avatar && googlePicture) {
        user.avatar = googlePicture;
        await user.save();
      }
    }

    // Verify account is active
    if (!user.active || user.accountStatus === 'Deactivated') {
      console.warn(`⛔ [OAuth] Account is inactive: ${user.username}`);
      return redirectWithError('account_deactivated');
    }

    // 4. Issue RoadReady JWT session token
    const token = generateToken({
      id: user._id,
      username: user.username,
      role: user.role,
    });

    // Clear PKCE state cookie
    res.clearCookie('rr_oauth_pkce');

    // 5. Redirect user back to React frontend callback handler with JWT
    const redirectUrl = `${clientOrigin.replace(/\/$/, '')}/auth/callback?token=${encodeURIComponent(token)}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('❌ [OAuth] Error processing Google callback:', err);
    return redirectWithError('oauth_server_error');
  }
};

module.exports = {
  getGoogleAuthStatus,
  initiateGoogleAuth,
  handleGoogleCallback,
};
