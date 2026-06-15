// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isAuthenticatedLoginState } from './cloudbase';

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
});
