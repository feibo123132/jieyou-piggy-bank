import cloudbase from '@cloudbase/js-sdk';

let app: any = null;
let auth: any = null;
let db: any = null;

export const initCloudBase = (envId: string) => {
  if (!envId) return null;
  
  if (app) {
    // If already initialized with same envId, return it
    // Note: JS SDK doesn't expose envId easily on app instance, 
    // but usually we only init once per session or reload.
    return app;
  }

  try {
    app = cloudbase.init({
      env: envId
    });
    auth = app.auth();
    db = app.database();
    return app;
  } catch (e) {
    console.error('CloudBase init failed:', e);
    return null;
  }
};

export const loginAnonymous = async () => {
  if (!auth) throw new Error('CloudBase not initialized');
  
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
