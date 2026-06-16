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

const getLoginStateEmail = (loginState: any): string => {
  return String(
    loginState?.user?.email ||
    loginState?.email ||
    loginState?.user?.emailAddress ||
    ''
  ).trim().toLowerCase();
};

export const isAuthenticatedLoginState = (loginState: any, expectedEmail?: string) => {
  if (!loginState || isAnonymousLoginState(loginState)) return false;

  const target = expectedEmail?.trim().toLowerCase();
  if (!target) return true;

  const stateEmail = getLoginStateEmail(loginState);
  // If SDK does not expose email for this session, force explicit re-login.
  return Boolean(stateEmail && stateEmail === target);
};

export const hasAuthenticatedSession = async (expectedEmail?: string) => {
  if (!auth) return false;
  try {
    const loginState = await auth.getLoginState();
    return isAuthenticatedLoginState(loginState, expectedEmail);
  } catch (error) {
    console.error('[TCB] Failed to check login state:', error);
    return false;
  }
};

export const subscribeAuthenticatedSessionChanges = (
  expectedEmail: string | undefined,
  onInvalidated: () => void,
) => {
  if (!auth || typeof auth.onLoginStateChanged !== 'function') {
    return () => {};
  }

  let hasSeenAuthenticatedSession = false;
  const unsubscribe = auth.onLoginStateChanged((loginState: any) => {
    if (isAuthenticatedLoginState(loginState, expectedEmail)) {
      hasSeenAuthenticatedSession = true;
      return;
    }

    if (hasSeenAuthenticatedSession || expectedEmail?.trim()) {
      onInvalidated();
    }
  });

  return typeof unsubscribe === 'function' ? unsubscribe : () => {};
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

export const loginWithPassword = async (params: { email: string; password: string }) => {
  if (!auth) throw new Error('[TCB Fatal] Auth is not initialized. Please check SDK config.');
  const email = params.email.trim();
  const { password } = params;

  if (typeof auth.signInWithPassword === 'function') {
    const result = await auth.signInWithPassword({ email, username: email, password });
    if (result?.error) throw result.error;
    return auth.currentUser || result;
  }

  if (typeof auth.signIn === 'function') {
    const result = await auth.signIn({ username: email, email, password });
    if (result?.error) throw result.error;
    return auth.currentUser || result;
  }

  if (typeof auth.signInWithEmailAndPassword === 'function') {
    return auth.signInWithEmailAndPassword(email, password);
  }

  throw new Error('当前 CloudBase SDK 不支持邮箱密码登录，请检查 SDK 版本。');
};

export const getVerificationId = (verificationContext: any): string => {
  if (!verificationContext || typeof verificationContext !== 'object') return '';
  return String(
    verificationContext.verification_id ||
    verificationContext.verificationId ||
    verificationContext.id ||
    ''
  ).trim();
};

export const getVerificationToken = (verifyResult: any): string => {
  if (!verifyResult || typeof verifyResult !== 'object') return '';
  return String(
    verifyResult.verification_token ||
    verifyResult.verificationToken ||
    verifyResult.token ||
    ''
  ).trim();
};

export const isPasswordLoginDisabledError = (error: unknown) => {
  const normalized = JSON.stringify(error || {}).toLowerCase();
  return normalized.includes('username/password') ||
    normalized.includes('email/password') ||
    normalized.includes('password login') ||
    normalized.includes('identity source') ||
    normalized.includes('sign_in_method_not_found');
};

export const resetPasswordWithEmailCode = async (params: {
  email: string;
  code: string;
  newPassword: string;
  verificationContext: any;
}) => {
  if (!auth) throw new Error('[TCB Fatal] Auth is not initialized. Please check SDK config.');
  if (typeof auth.verify !== 'function' || typeof auth.resetPassword !== 'function') {
    throw new Error('当前 CloudBase SDK 不支持设置密码，请检查 SDK 版本。');
  }

  const verificationId = getVerificationId(params.verificationContext);
  if (!verificationId) {
    throw new Error('验证码上下文已失效，请重新发送验证码。');
  }

  const verifyResult = await auth.verify({
    verification_id: verificationId,
    verification_code: params.code.trim(),
  });
  const verificationToken = getVerificationToken(verifyResult);
  if (!verificationToken) {
    throw new Error('验证成功但未获取到密码重置令牌。');
  }

  await auth.resetPassword({
    email: params.email.trim(),
    new_password: params.newPassword,
    verification_token: verificationToken,
  });
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
