import { useState } from 'react';

import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { Field } from '@/components/ui/InputField';
import { FirebaseError } from '@/services/FirebaseError';
import { useGoogleSignIn } from '@/services/auth/auth.hooks';
import { ensureLocalAccount, signUp } from '@/services/auth/auth.services';
import { useUpdateProfile } from '@/services/profile/profile.hooks';

export default function SignupScreen() {
  const { signInWithGoogle } = useGoogleSignIn();
  const updateProfile = useUpdateProfile();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('Name, valid email, and a password of at least 6 characters are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await signUp(email.trim(), password);
      // The server seeds a name from the provider token, which is null for
      // email/password sign-ups — so set the name the student typed. Fire and
      // forget: a failed name write must not fail sign-up, and React Query
      // tracks the error on the mutation.
      updateProfile.mutate({ fullName: fullName.trim() });
      await ensureLocalAccount(user.uid);
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

  return (
    <AuthScreenLayout
      title="Create account"
      subtitle="Start tracking your academics"
      error={error}
      submitLabel="Sign Up"
      submitLoading={loading}
      onSubmit={handleSubmit}
      googleLoading={googleLoading}
      onGoogle={handleGoogle}
      footerPrompt="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkHref="/login">
      <Field
        required
        label="Full name"
        placeholder="Your name"
        autoComplete="name"
        value={fullName}
        onChangeText={setFullName}
      />
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
        placeholder="At least 6 characters"
        secureTextEntry
        autoComplete="password-new"
        value={password}
        onChangeText={setPassword}
      />
    </AuthScreenLayout>
  );
}
