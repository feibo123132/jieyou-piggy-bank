import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';

export const LoginOverlay: React.FC = () => {
  const { updateSettings, pullFromCloud } = useAppStore();
  const [inputUsername, setInputUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedUsername = inputUsername.trim();
    if (!trimmedUsername) return;
    
    setIsLoading(true);
    
    // Call pullFromCloud directly with the username.
    // This function now handles:
    // 1. Fetching data
    // 2. Setting the state (including username) ONLY after fetch logic is done.
    await pullFromCloud(trimmedUsername);
    
    setIsLoading(false);
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
            <h1 className="text-2xl font-bold text-gray-800 mb-2">登录 / 同步</h1>
            <p className="text-sm text-gray-500">
              输入任意ID以标识您的身份（无需注册）
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                用户名 / 身份ID
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
              onClick={handleLogin}
              disabled={!inputUsername.trim() || isLoading}
            >
              {isLoading ? '同步中...' : '登 录'}
            </Button>
            
            <p className="text-xs text-center text-gray-400 mt-4">
              如需新账号，直接输入一个新的ID即可自动创建
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
