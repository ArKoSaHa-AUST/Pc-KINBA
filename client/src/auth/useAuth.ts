import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';

/** Access the auth store. Must be used within an {@link AuthProvider}. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
