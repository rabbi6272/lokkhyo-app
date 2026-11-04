import { useState } from 'react';

import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { Field } from '@/components/ui/InputField';
import { useAuth } from '@/providers/auth-provider';
import { FirebaseError } from '@/services/FirebaseError';
import { useGoogleSignIn } from '@/services/auth/auth.hooks';
import { ensureLocalAccount, signIn } from '@/services/auth/auth.services';

export default function LoginScreen() {
  const { user } = useAuth();
  const { signInWithGoogle } = useGoogleSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(FirebaseError((e as any).code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      if (!googleUser) return;
      await ensureLocalAccount(googleUser.uid);
    } catch (e) {
      setError(FirebaseError((e as any)?.code ?? e));
    } finally {
      setGoogleLoading(false);
    }
  };

  if (user) return null;

  return (
    <AuthScreenLayout
      title="Welcome back"
      subtitle="Sign in to track your progress"
      error={error}
      submitLabel="Sign In"
      submitLoading={loading}
      onSubmit={handleSubmit}
      googleLoading={googleLoading}
      onGoogle={handleGoogle}
      footerPrompt="Don't have an account?"
      footerLinkLabel="Sign up"
      footerLinkHref="/signup">
      <Field
        required
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        required
        label="Password"
        placeholder="••••••••"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
      />
    </AuthScreenLayout>
  );
}
