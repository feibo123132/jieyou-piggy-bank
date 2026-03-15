import cloudbase from '@cloudbase/js-sdk';

const envId = import.meta.env.VITE_TCB_ENV_ID;

let app: any = null;
let auth: any = null;
let db: any = null;

if (envId) {
  try {
    console.log('[TCB] Initializing...');
    app = cloudbase.init({
      env: envId,
      persistence: 'local' // Keep login/session data locally for better mobile compatibility.
    });
    auth = app.auth();
    db = app.database();
    console.log('[TCB] Initialization complete.');
  } catch (e) {
    console.error('[TCB Fatal] Initialization failed:', e);
  }
} else {
  console.warn('[TCB] VITE_TCB_ENV_ID is not set. Cloud sync will be disabled.');
}

export const loginAnonymous = async () => {
  if (!auth) {
    console.warn('[TCB] CloudBase not initialized (missing env ID?)');
    return null;
  }

  const loginState = await auth.getLoginState();
  if (!loginState) {
    await auth.anonymousAuthProvider().signIn();
  }
  return auth.currentUser;
};

const isAnonymousLoginState = (loginState: any): boolean => {
  if (!loginState) return true;
  if (typeof loginState.isAnonymous === 'boolean') return loginState.isAnonymous;
  if (typeof loginState?.user?.isAnonymous === 'boolean') return loginState.user.isAnonymous;

  const loginType = String(
    loginState.loginType ||
    loginState.type ||
    loginState?.user?.loginType ||
    ''
  ).toLowerCase();

  return loginType.includes('anonymous');
};

export const hasAuthenticatedSession = async (expectedEmail?: string) => {
  if (!auth) return false;
  try {
    const loginState = await auth.getLoginState();
    if (!loginState) return false;
    if (isAnonymousLoginState(loginState)) return false;

    const stateEmail = String(loginState?.user?.email || '').trim().toLowerCase();
    if (expectedEmail) {
      const target = expectedEmail.trim().toLowerCase();
      // If SDK does not expose email for this session, force explicit re-login.
      if (!stateEmail) return false;
      return stateEmail === target;
    }

    return true;
  } catch (error) {
    console.error('[TCB] Failed to check login state:', error);
    return false;
  }
};

export const getDb = () => {
  if (!db) throw new Error('[TCB] CloudBase not initialized');
  return db;
};

export const sendVerificationCode = async (email: string) => {
  console.log('[TCB] Sending verification code:', email);

  if (!auth) {
    const msg = '[TCB Fatal] Auth is not initialized. Please check SDK config.';
    console.error(msg);
    throw new Error(msg);
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out, please check network and retry.')), 10000)
  );

  try {
    const result = await Promise.race([
      auth.getVerification({ email }),
      timeoutPromise
    ]);
    console.log('[TCB] Verification code sent successfully.', result);
    return result; // verificationInfo context
  } catch (error: any) {
    console.error('[TCB] Failed to send verification code:', error);
    throw error;
  }
};

export const loginWithEmail = async (params: { email: string; code: string; verificationContext: any }) => {
  if (!auth) return;
  const { email, code, verificationContext } = params;

  try {
    await auth.signInWithEmail({
      email,
      verificationCode: code,
      verificationInfo: verificationContext
    });
    return auth.currentUser;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const saveUserState = async (username: string, fullState: any) => {
  if (!db || !auth) return;
  const safeUsername = username?.trim();
  if (!safeUsername) return;

  try {
    await db.collection('transactions').doc(safeUsername).set({
      ...fullState,
      updatedAt: new Date().toISOString()
    });
    console.log(`[Cloud] User state saved for: ${safeUsername}`);
  } catch (error) {
    console.error(`Failed to save user state to cloud for user [${safeUsername}]:`, error);
  }
};

export const loadUserState = async (username: string) => {
  if (!db || !auth) return null;
  const safeUsername = username?.trim();
  if (!safeUsername) return null;

  try {
    const res = await db.collection('transactions').doc(safeUsername).get();
    if (res.data && res.data.length > 0) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.error(`Failed to load user state from cloud for user [${safeUsername}]:`, error);
    return null;
  }
};
