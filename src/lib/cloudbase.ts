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

// Data Sync Logic
export const syncTransactions = async (localTransactions: any[]) => {
  if (!db || !auth) return;
  
  const user = auth.currentUser;
  if (!user) return;

  try {
    const _ = db.command;
    const collection = db.collection('transactions');
    
    // 1. Fetch cloud data
    const res = await collection.where({
      _openid: user.uid
    }).limit(1000).get();
    
    const cloudData = res.data;
    
    // 2. Simple Merge Strategy (Cloud wins for conflict, or Union)
    // For MVP, let's just use Cloud as source of truth if it has data,
    // otherwise push local data.
    // Ideally we need a 'updatedAt' timestamp to merge correctly.
    
    // TODO: Implement robust sync with deletedAt handling
    return cloudData;
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
};

export const addTransactionToCloud = async (transaction: any) => {
  if (!db || !auth) return;
  
  try {
    const collection = db.collection('transactions');
    await collection.add({
      ...transaction,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to add transaction to cloud:', error);
  }
};
