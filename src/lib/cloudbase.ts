import cloudbase from '@cloudbase/js-sdk';

const envId = import.meta.env.VITE_TCB_ENV_ID;

let app: any = null;
let auth: any = null;
let db: any = null;

if (envId) {
  try {
    app = cloudbase.init({
      env: envId
    });
    auth = app.auth();
    db = app.database();
  } catch (e) {
    console.error('CloudBase init failed:', e);
  }
} else {
  console.warn('VITE_TCB_ENV_ID is not set. Cloud sync will be disabled.');
}

export const loginAnonymous = async () => {
  if (!auth) {
    console.warn('CloudBase not initialized (missing env ID?)');
    return null;
  }
  
  const loginState = await auth.getLoginState();
  if (!loginState) {
    await auth.anonymousAuthProvider().signIn();
  }
  return auth.currentUser;
};

export const getDb = () => {
  if (!db) throw new Error('CloudBase not initialized');
  return db;
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
