import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Flame,
  KeyRound,
  Lock,
  Mail,
  PiggyBank,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { isPasswordLoginDisabledError } from '@/lib/cloudbase';

type AuthMode = 'code' | 'password' | 'setup';
type MessageState = { type: 'info' | 'success' | 'error'; text: string } | null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 6;

const AUTH_COPY: Record<AuthMode, { title: string; description: string; submitText: string; footnote: string }> = {
  code: {
    title: '验证码登录',
    description: '无需记忆密码，用邮箱验证码快速进入你的存钱罐。',
    submitText: '确认登录',
    footnote: '首次登录可先用验证码，再到“设置密码”完成绑定。',
  },
  password: {
    title: '邮箱密码登录',
    description: '用邮箱和密码直接登录，适合日常快速打开应用。',
    submitText: '登录',
    footnote: '忘记密码？切换到“设置密码”重新完成验证。',
  },
  setup: {
    title: '设置或重置密码',
    description: '先验证邮箱，再为当前账号设置新的登录密码。',
    submitText: '确认设置密码',
    footnote: '密码不会保存到业务数据里，只走 CloudBase 认证能力。',
  },
};

const MODES: Array<{ id: AuthMode; label: string }> = [
  { id: 'code', label: '验证码' },
  { id: 'password', label: '密码' },
  { id: 'setup', label: '设置密码' },
];

export const LoginOverlay: React.FC = () => {
  const {
    sendAuthCode,
    loginAndSync,
    loginWithPasswordAndSync,
    setPasswordAndSync,
  } = useAppStore();
  const [mode, setMode] = useState<AuthMode>('code');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<MessageState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);

  const copy = AUTH_COPY[mode];
  const needsCode = mode === 'code' || mode === 'setup';
  const canResend = countdown <= 0 && !isLoading;

  const primaryDisabled = useMemo(() => {
    if (!isValidEmail(email) || isLoading) return true;
    if (mode === 'password') return !password;
    if (mode === 'code') return !codeSent || !code.trim();
    return !codeSent || !code.trim() || !newPassword || !confirmPassword;
  }, [code, codeSent, confirmPassword, email, isLoading, mode, newPassword, password]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const resetModeFields = (nextMode: AuthMode) => {
    setMode(nextMode);
    setCode('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCodeSent(false);
    setCountdown(0);
    setMessage(null);
  };

  const validateEmail = () => {
    if (!isValidEmail(email)) {
      setMessage({ type: 'error', text: '请输入有效的邮箱地址。' });
      return false;
    }
    return true;
  };

  const handleSendCode = async () => {
    if (!validateEmail()) return;
    setIsLoading(true);
    setMessage(null);

    try {
      const success = await sendAuthCode(email.trim());
      if (success) {
        setCodeSent(true);
        setCountdown(60);
        setMessage({ type: 'success', text: '验证码已发送，请查看邮箱。' });
      }
    } catch (error: any) {
      const errorMsg = error?.message || error?.code || '验证码发送失败，请检查邮箱配置或稍后重试。';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateEmail()) return;
    setIsLoading(true);
    setMessage(null);

    try {
      if (mode === 'code') {
        if (!code.trim()) throw new Error('请输入验证码。');
        await loginAndSync(email.trim(), code.trim());
        return;
      }

      if (mode === 'password') {
        if (!password) throw new Error('请输入密码。');
        await loginWithPasswordAndSync(email.trim(), password);
        return;
      }

      if (!code.trim()) throw new Error('请输入验证码。');
      if (!newPassword || newPassword.length < PASSWORD_MIN_LENGTH) {
        throw new Error(`请输入至少 ${PASSWORD_MIN_LENGTH} 位的新密码。`);
      }
      if (newPassword !== confirmPassword) {
        throw new Error('两次输入的密码不一致，请重新确认。');
      }

      await setPasswordAndSync(email.trim(), code.trim(), newPassword);
    } catch (error: any) {
      if (mode === 'password' && isPasswordLoginDisabledError(error)) {
        setMessage({
          type: 'error',
          text: 'CloudBase 控制台还未开启“邮箱密码登录”，请先在登录授权中开启。',
        });
      } else {
        setMessage({
          type: 'error',
          text: error?.message || '登录失败，请检查输入后重试。',
        });
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="jieyou-login-stage">
      <div className="jieyou-login-dots" />
      <div className="jieyou-login-shape jieyou-login-shape-left" />
      <div className="jieyou-login-shape jieyou-login-shape-right" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="jieyou-login-shell"
      >
        <aside className="jieyou-login-companion" aria-label="登录说明">
          <div className="jieyou-login-bubble">
            <span className="jieyou-login-fire">
              <Flame size={27} />
            </span>
            <div>
              <h1>JIEYOU存钱罐</h1>
              <p>攒钱也可以像闯关一样</p>
            </div>
          </div>

          <div className="jieyou-login-archive-card">
            <div className="jieyou-login-archive-title">
              <span className="jieyou-login-trophy">
                <Trophy size={31} />
              </span>
              <div>
                <p>个人身份认证</p>
                <h2>进入你的存钱档案</h2>
              </div>
            </div>
            <p className="jieyou-login-archive-copy">
              登录后，预算、历史记录、日历足迹和云端同步会回到同一个账号里。今天也从确认身份开始，把小猪存钱罐继续往前推一点。
            </p>
            <div className="jieyou-login-badges">
              <InfoPill icon={<ShieldCheck size={18} />} label="邮箱认证" color="green" />
              <InfoPill icon={<PiggyBank size={18} />} label="云端存档" color="red" />
              <InfoPill icon={<Sparkles size={18} />} label="连续记录" color="yellow" />
            </div>
          </div>
        </aside>

        <section className="jieyou-login-panel" aria-label="登录表单">
          <header className="jieyou-login-head">
            <div>
              <div className="jieyou-login-tag">
                <KeyRound size={16} />
                LOGIN
              </div>
              <h2>{copy.title}</h2>
              <p>{copy.description}</p>
            </div>
            <span className="jieyou-login-head-icon">
              <Flame size={30} />
            </span>
          </header>

          <div className="jieyou-login-tabs" role="tablist" aria-label="登录方式">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === mode}
                className={item.id === mode ? 'is-active' : ''}
                onClick={() => resetModeFields(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="jieyou-login-form">
            <Field label="邮箱地址" icon={<Mail size={21} />}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your-email@example.com"
                autoComplete="email"
                className="jieyou-login-input"
              />
            </Field>

            {needsCode && (
              <Field label="邮箱验证码" icon={<Lock size={21} />}>
                <div className="jieyou-login-code-row">
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="输入验证码"
                    inputMode="numeric"
                    className="jieyou-login-input"
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={!canResend}
                    className="jieyou-login-send"
                  >
                    {countdown > 0 ? `${countdown}s` : (
                      <>
                        {codeSent ? <RotateCcw size={17} /> : <Send size={17} />}
                        {codeSent ? '重发' : '发送'}
                      </>
                    )}
                  </button>
                </div>
              </Field>
            )}

            {mode === 'password' && (
              <Field label="登录密码" icon={<Lock size={21} />}>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入登录密码"
                  autoComplete="current-password"
                  className="jieyou-login-input"
                />
              </Field>
            )}

            {mode === 'setup' && (
              <div className="jieyou-login-password-grid">
                <Field label="新密码" icon={<Lock size={21} />}>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="至少 6 位"
                    autoComplete="new-password"
                    className="jieyou-login-input"
                  />
                </Field>
                <Field label="确认密码" icon={<Lock size={21} />}>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="再次输入"
                    autoComplete="new-password"
                    className="jieyou-login-input"
                  />
                </Field>
              </div>
            )}

            {message && (
              <div className={`jieyou-login-message is-${message.type}`} role="status" aria-live="polite">
                {message.text}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={primaryDisabled}
              className="jieyou-login-primary"
            >
              {isLoading ? '处理中...' : copy.submitText}
              {!isLoading && <ArrowRight size={19} />}
            </button>

            <div className="jieyou-login-footnote">{copy.footnote}</div>
          </div>
        </section>
      </motion.div>
    </div>
  );
};

const Field: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  label,
  icon,
  children,
}) => (
  <label className="jieyou-login-field">
    <span className="jieyou-login-label">{label}</span>
    <span className="jieyou-login-input-wrap">
      <span className="jieyou-login-input-icon">{icon}</span>
      {children}
    </span>
  </label>
);

const InfoPill: React.FC<{ icon: React.ReactNode; label: string; color: 'green' | 'red' | 'yellow' }> = ({
  icon,
  label,
  color,
}) => (
  <span className="jieyou-login-pill">
    <span className={`jieyou-login-pill-icon is-${color}`}>{icon}</span>
    {label}
  </span>
);

const isValidEmail = (value: string) => EMAIL_REGEX.test(value.trim());
