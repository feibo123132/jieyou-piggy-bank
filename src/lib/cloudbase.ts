import cloudbase from '@cloudbase/js-sdk';

const envId = import.meta.env.VITE_TCB_ENV_ID;

let app: any = null;
let auth: any = null;
let db: any = null;

if (envId) {
  try {
    console.log('[TCB] 开始初始化...');
    app = cloudbase.init({
      env: envId,
      persistence: 'local' // Force local persistence for better mobile compatibility
    });
    auth = app.auth();
    db = app.database();
    console.log('[TCB] 初始化完成');
  } catch (e) {
    console.error('[TCB Fatal] 初始化失败:', e);
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

export const getDb = () => {
  if (!db) throw new Error('[TCB] CloudBase not initialized');
  return db;
};

export const sendVerificationCode = async (email: string) => {
  console.log('[TCB] 尝试发送验证码:', email); 
   
  if (!auth) { 
    const msg = '[TCB Fatal] Auth 对象未初始化！请检查 SDK 配置。'; 
    console.error(msg); 
    throw new Error(msg); 
  } 
 
  // 设置 10 秒超时竞速 
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('请求超时，请检查网络或刷新重试')), 10000) 
  ); 
 
  try { 
    const result = await Promise.race([ 
      auth.getVerification({ email }), 
      timeoutPromise 
    ]); 
    console.log('[TCB] 发送成功:', result); 
    return result; // Returns verificationInfo context
  } catch (error: any) { 
    console.error('[TCB] 发送失败详情:', error); 
    throw error; // 抛出给 UI 层显示 Alert 
  } 
};

export const loginWithEmail = async (params: { email: string; code: string; verificationContext: any }) => {
  if (!auth) return;
  const { email, code, verificationContext } = params;
  
  try {
    // Strict argument passing: Explicitly map verificationInfo
    await auth.signInWithEmail({
      email,
      verificationCode: code,
      verificationInfo: verificationContext // Do not spread context
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
    const collection = db.collection('transactions');
    // Use username as Document ID for full state sync
    await collection.doc(safeUsername).set({
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
    const collection = db.collection('transactions');
    const res = await collection.doc(safeUsername).get();
    
    if (res.data && res.data.length > 0) {
       // CloudBase get() returns array even for doc() query sometimes, or check res.data object
       // SDK doc says doc().get() returns { data: Object, ... } if exists
       // But let's be safe.
       return res.data; 
    }
    // If doc not found
    return null;
  } catch (error) {
    console.error(`Failed to load user state from cloud for user [${safeUsername}]:`, error);
    return null;
  }
};
