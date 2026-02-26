import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { Mail, Lock, Send, ArrowRight } from 'lucide-react';

export const LoginOverlay: React.FC = () => {
  const { sendAuthCode, loginAndSync } = useAppStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Timer logic
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      alert("请输入有效的邮箱地址");
      return;
    }
    setIsLoading(true);
    
    try {
      const success = await sendAuthCode(email.trim());
      if (success) {
        setStep('code');
        setCountdown(60);
      }
    } catch (error: any) {
      console.error("发送验证码完整错误:", error);
      // 提取真实错误码和信息，展示给用户（以便截图排查）
      const errorMsg = error.message || error.code || JSON.stringify(error);
      alert(`发送失败! 真实原因: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed redundant handleSendCodeAction


  const handleLogin = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    try {
      await loginAndSync(email.trim(), code.trim());
    } catch (e) {
      console.error(e);
      alert("登录失败，请检查验证码是否正确");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-t-4 border-primary p-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">安全登录</h1>
            <p className="text-sm text-gray-500">
              使用邮箱验证码登录以同步您的数据
            </p>
          </div>

          <div className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">邮箱地址</label>
              <div className="relative">
                <div className="absolute left-3 top-3 text-gray-400">
                  <Mail size={20} />
                </div>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-10 py-2" // Adjusted padding
                  disabled={step === 'code'}
                />
              </div>
            </div>

            {/* Code Input (Conditional) */}
            {step === 'code' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-sm font-medium text-gray-700">验证码</label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-3 text-gray-400">
                      <Lock size={20} />
                    </div>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="6位数字"
                      className="pl-10 py-2"
                    />
                  </div>
                  <Button 
                    variant="secondary" // Changed to secondary/outline
                    onClick={handleSendCode}
                    disabled={countdown > 0 || isLoading}
                    className="w-32"
                  >
                    {countdown > 0 ? `${countdown}s` : '重发'}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Actions */}
            {step === 'email' ? (
              <Button 
                fullWidth 
                size="lg" 
                onClick={handleSendCode}
                disabled={!email || isLoading}
              >
                {isLoading ? '发送中...' : '发送验证码'}
                {!isLoading && <Send size={18} className="ml-2" />}
              </Button>
            ) : (
              <Button 
                fullWidth 
                size="lg" 
                onClick={handleLogin}
                disabled={!code || isLoading}
              >
                {isLoading ? '登录中...' : '登 录'}
                {!isLoading && <ArrowRight size={18} className="ml-2" />}
              </Button>
            )}
            
            {step === 'code' && (
              <button 
                onClick={() => setStep('email')}
                className="w-full text-sm text-gray-400 hover:text-gray-600 mt-4 underline"
              >
                更换邮箱
              </button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
