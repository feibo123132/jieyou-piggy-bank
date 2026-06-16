// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  getVerificationId,
  getVerificationToken,
  isAuthenticatedLoginState,
  isPasswordLoginDisabledError,
} from './cloudbase';

describe('CloudBase auth helpers', () => {
  it('treats missing or anonymous login state as unauthenticated', () => {
    expect(isAuthenticatedLoginState(null, 'user@example.com')).toBe(false);
    expect(isAuthenticatedLoginState({ user: { isAnonymous: true } }, 'user@example.com')).toBe(false);
  });

  it('requires the login email to match the expected account', () => {
    expect(isAuthenticatedLoginState({ user: { email: 'user@example.com', isAnonymous: false } }, 'user@example.com')).toBe(true);
    expect(isAuthenticatedLoginState({ user: { email: 'other@example.com', isAnonymous: false } }, 'user@example.com')).toBe(false);
    expect(isAuthenticatedLoginState({ user: { isAnonymous: false } }, 'user@example.com')).toBe(false);
  });

  it('extracts verification identifiers from CloudBase-compatible response shapes', () => {
    expect(getVerificationId({ verification_id: 'snake-id' })).toBe('snake-id');
    expect(getVerificationId({ verificationId: 'camel-id' })).toBe('camel-id');
    expect(getVerificationId({ id: 'plain-id' })).toBe('plain-id');
    expect(getVerificationId(null)).toBe('');
  });

  it('extracts password reset tokens from CloudBase-compatible verify results', () => {
    expect(getVerificationToken({ verification_token: 'snake-token' })).toBe('snake-token');
    expect(getVerificationToken({ verificationToken: 'camel-token' })).toBe('camel-token');
    expect(getVerificationToken({ token: 'plain-token' })).toBe('plain-token');
    expect(getVerificationToken(undefined)).toBe('');
  });

  it('recognizes CloudBase password-login-disabled errors', () => {
    expect(isPasswordLoginDisabledError({ message: 'SIGN_IN_METHOD_NOT_FOUND' })).toBe(true);
    expect(isPasswordLoginDisabledError({ message: 'network request error' })).toBe(false);
  });
});
