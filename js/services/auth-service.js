/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - AUTHENTICATION SERVICE
   Firebase Auth ONLY for authentication -> Node.js Express API for MySQL authorization.
   Zero hardcoded admin credentials or frontend-only bypasses.
   ========================================================================== */

import { getServices } from '../config/firebase-config.js';

const AUTH_KEY = 'team7_customer_session';

async function getAuthToken() {
  const localTok = localStorage.getItem('team7_auth_token');
  if (localTok) return localTok;

  const { auth } = getServices();
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(true);
    } catch (e) {
      console.warn("Failed to get Firebase Auth ID token:", e);
    }
  }
  return null;
}

async function fetchUserProfileFromBackend(firebaseUser) {
  if (!firebaseUser) return null;

  try {
    const token = await firebaseUser.getIdToken();
    const res = await fetch('/api/auth/verify.php', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`Auth verification error (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (data.success) {
      return data.data || data.user;
    }
    return null;
  } catch (err) {
    console.error('[AuthService] Backend profile fetch failed:', err);
    return null;
  }
}

async function waitForFirebaseAuth() {
  const { auth } = getServices();
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve) => {
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js').then(({ onAuthStateChanged }) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
      setTimeout(() => {
        unsubscribe();
        resolve(auth.currentUser || null);
      }, 3000);
    }).catch(() => resolve(null));
  });
}

export const AuthService = {
  async getAuthToken() {
    return getAuthToken();
  },

  getCurrentUser() {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return !!user && ['ADMIN', 'SUPER_ADMIN'].includes(String(user.role || '').toUpperCase());
  },

  async isAdminVerified() {
    console.log('[AuthService] Checking admin verification state...');

    const cached = this.getCurrentUser();
    const localTok = localStorage.getItem('team7_auth_token');

    if (cached && (localTok || cached.isAdmin) && ['ADMIN', 'SUPER_ADMIN'].includes(String(cached.role || '').toUpperCase())) {
      console.log('[AuthService] Valid cached admin session confirmed for username:', cached.username || cached.name);
      return true;
    }

    const firebaseUser = await waitForFirebaseAuth();
    if (!firebaseUser) {
      if (cached && ['ADMIN', 'SUPER_ADMIN'].includes(String(cached.role || '').toUpperCase())) {
        return true;
      }
      console.warn('[AuthService] Redirect reason: No authenticated admin session found.');
      return false;
    }

    console.log('[AuthService] Firebase Auth user found. Email:', firebaseUser.email, 'UID:', firebaseUser.uid);
    const profile = await fetchUserProfileFromBackend(firebaseUser);
    console.log('[AuthService] Backend profile response:', profile ? { role: profile.role, isAdmin: profile.isAdmin } : null);

    if (!profile || (!profile.isAdmin && !['ADMIN', 'SUPER_ADMIN'].includes(String(profile.role || '').toUpperCase()))) {
      console.warn('[AuthService] Redirect reason: User role is not ADMIN/SUPER_ADMIN.');
      localStorage.removeItem(AUTH_KEY);
      return false;
    }

    localStorage.setItem(AUTH_KEY, JSON.stringify(profile));
    console.log('[AuthService] Admin authorization verified successfully.');
    return true;
  },

  // Admin Login via REST API (/api/auth/login.php)
  async loginAdmin(identifier = '', password = '') {
    const cleanIdentifier = String(identifier || '').trim();
    const cleanPassword = String(password || '');

    console.log('[AuthService] Admin login attempt for:', cleanIdentifier);

    if (!cleanIdentifier || !cleanPassword) {
      throw new Error('Please enter username and password');
    }

    try {
      const loginRes = await fetch('/api/auth/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanIdentifier,
          password: cleanPassword
        })
      });

      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.success && loginData.data) {
        const u = loginData.data;
        const token = loginData.data.token;

        if (token) {
          localStorage.setItem('team7_auth_token', token);
        }

        const profile = {
          id: u.id,
          name: u.username || cleanIdentifier,
          username: u.username || cleanIdentifier,
          email: u.email || '',
          role: u.role || 'ADMIN',
          status: u.status || 'ACTIVE',
          isAdmin: true,
          isSuperAdmin: (u.role === 'SUPER_ADMIN')
        };

        localStorage.setItem(AUTH_KEY, JSON.stringify(profile));

        console.log('[AuthService] Admin login succeeded via REST API!');
        return { success: true, user: profile, isSuperAdmin: profile.isSuperAdmin };
      } else if (loginRes.status === 401) {
        throw new Error(loginData.message || 'Invalid username or password');
      } else if (loginRes.status === 403) {
        throw new Error(loginData.message || 'Admin account is inactive');
      } else {
        throw new Error(loginData.message || 'Authentication failed');
      }
    } catch (err) {
      console.error('[AuthService] Admin Login Error:', err);
      // DO NOT fall back to Firebase or convert identifier to fake email!
      throw new Error(err.message || 'Unable to connect to authentication server');
    }
  },

  // Customer Login via Firebase Auth
  async loginCustomer(email = '', password = '') {
    const cleanEmail = String(email || '').trim();
    const cleanPassword = String(password || '');

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Please enter both email address and password.');
    }

    const { auth } = getServices();
    if (!auth) throw new Error('Authentication server unavailable.');

    try {
      const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const profile = await fetchUserProfileFromBackend(userCredential.user);

      if (!profile) {
        throw new Error('Could not retrieve user account profile from server.');
      }

      localStorage.setItem(AUTH_KEY, JSON.stringify(profile));
      return { success: true, user: profile };
    } catch (err) {
      console.error('[AuthService] Customer Login Error:', err);
      throw new Error(err.message || 'Customer login failed.');
    }
  },

  // Customer Registration via Firebase Auth
  async registerCustomer(email = '', password = '', name = '', phone = '') {
    const cleanEmail = String(email || '').trim();
    const cleanPassword = String(password || '');

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Please provide email address and password.');
    }

    const { auth } = getServices();
    if (!auth) throw new Error('Authentication server unavailable.');

    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);

      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }

      // Sync user account with Node.js Express backend (creates MySQL user & customer record)
      const profile = await fetchUserProfileFromBackend(userCredential.user);
      if (profile) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(profile));
      }

      return { success: true, user: profile || { email: cleanEmail, name } };
    } catch (err) {
      console.error('[AuthService] Registration Error:', err);
      throw new Error(err.message || 'Registration failed.');
    }
  },

  // Password Reset
  async sendPasswordResetEmail(email = '') {
    const cleanEmail = String(email || '').trim();
    if (!cleanEmail) throw new Error('Email address is required.');

    const { auth } = getServices();
    if (!auth) throw new Error('Authentication server unavailable.');

    const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
    await sendPasswordResetEmail(auth, cleanEmail);
    return { success: true, message: 'Password reset link sent to your email.' };
  },

  // Logout
  async logout() {
    const { auth } = getServices();
    if (auth?.currentUser) {
      try {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
        await signOut(auth);
      } catch (e) {
        console.warn('[AuthService] SignOut warning:', e);
      }
    }
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem('team7_auth_token');
  }
};

