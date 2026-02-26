import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, AlertCircle, Check } from 'lucide-react';

export const LoginOverlay: React.FC = () => {
  const { updateSettings, pullFromCloud, verifyAndLoadData, saveUserState } = useAppStore();
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Auth Flow States
  const [step, setStep] = useState<'username' | 'password' | 'create_password'>('username');
  const [pendingData, setPendingData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCheckUsername = async () => {
    const trimmedUsername = inputUsername.trim();
    if (!trimmedUsername) return;
    
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      const result = await pullFromCloud(trimmedUsername);
      
      if (result.status === 'auth_required') {
        setPendingData(result.data);
        setStep('password');
      } else if (result.status === 'not_found') {
        setStep('create_password');
      } else if (result.status === 'success') {
        // Logged in directly (no password set)
      } else {
        setErrorMsg('连接失败，请重试');
      }
    } catch (e) {
      setErrorMsg('网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!inputPassword) return;
    setIsLoading(true);
    setErrorMsg('');

    const success = await verifyAndLoadData(inputPassword, pendingData);
    if (!success) {
      setErrorMsg('密码错误，请重试');
      setIsLoading(false);
    }
    // If success, state updates will unmount this overlay
  };

  const handleCreateAccount = async () => {
    if (!inputPassword) return;
    setIsLoading(true);
    
    // Hash password
    const msgBuffer = new TextEncoder().encode(inputPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create new account
    // We manually set the state first
    updateSettings({ 
      username: inputUsername.trim(),
      passwordHash: hashHex
    });
    
    // Then save (Genesis Push)
    await saveUserState();
    
    // Force reload/init
    window.location.reload(); 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-t-4 border-primary">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {step === 'username' ? '登录 / 同步' : step === 'password' ? '欢迎回来' : '创建新账号'}
            </h1>
            <p className="text-sm text-gray-500">
              {step === 'username' && '输入任意ID以标识您的身份'}
              {step === 'password' && '检测到云端数据，请输入密码解锁'}
              {step === 'create_password' && '这是一个新ID，请设置保护密码'}
            </p>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {step === 'username' && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <User size={16} className="mr-2" /> 用户名 / 身份ID
                    </label>
                    <Input
                      value={inputUsername}
                      onChange={(e) => setInputUsername(e.target.value)}
                      placeholder="例如：zhangsan2024"
                      className="text-lg py-6"
                      autoFocus
                    />
                  </div>
                  <Button 
                    fullWidth 
                    size="lg" 
                    onClick={handleCheckUsername}
                    disabled={!inputUsername.trim() || isLoading}
                  >
                    {isLoading ? '检查中...' : '下一步'}
                  </Button>
                </motion.div>
              )}

              {step === 'password' && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <Lock size={16} className="mr-2" /> 验证密码
                    </label>
                    <Input
                      type="password"
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                      placeholder="请输入密码"
                      className="text-lg py-6"
                      autoFocus
                    />
                  </div>
                  <Button 
                    fullWidth 
                    size="lg" 
                    onClick={handleVerifyPassword}
                    disabled={!inputPassword || isLoading}
                  >
                    {isLoading ? '验证中...' : '解锁进入'}
                  </Button>
                  <button 
                    onClick={() => {
                      setStep('username');
                      setErrorMsg('');
                      setInputPassword('');
                    }}
                    className="text-sm text-gray-400 w-full text-center hover:text-gray-600"
                  >
                    切换账号
                  </button>
                </motion.div>
              )}

              {step === 'create_password' && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="bg-yellow-50 p-3 rounded-lg flex items-start space-x-2 text-sm text-yellow-700 mb-4">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <p>检测到该ID未被注册。请设置一个密码以保护您的数据。</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <Lock size={16} className="mr-2" /> 设置密码
                    </label>
                    <Input
                      type="password"
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                      placeholder="设置您的密码"
                      className="text-lg py-6"
                      autoFocus
                    />
                  </div>
                  <Button 
                    fullWidth 
                    size="lg" 
                    onClick={handleCreateAccount}
                    disabled={!inputPassword || isLoading}
                  >
                    {isLoading ? '创建中...' : '完成注册'}
                  </Button>
                  <button 
                    onClick={() => {
                      setStep('username');
                      setErrorMsg('');
                      setInputPassword('');
                    }}
                    className="text-sm text-gray-400 w-full text-center hover:text-gray-600"
                  >
                    返回修改ID
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center space-x-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg"
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
