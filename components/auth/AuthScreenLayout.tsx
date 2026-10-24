import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { GoogleButton } from '@/components/ui/GoogleButton';
import { OrDivider } from '@/components/ui/OrDivider';
import { useTheme } from '@/providers/theme-provider';

interface AuthScreenLayoutProps {
  title: string;
  subtitle: string;
  /** Inline error shown between the fields and the submit button. */
  error?: string;
  /** The form fields, rendered above the error and the buttons. */
  children: ReactNode;
  submitLabel: string;
  submitLoading?: boolean;
  onSubmit: () => void;
  googleLoading?: boolean;
  onGoogle: () => void;
  footerPrompt: string;
  footerLinkLabel: string;
  footerLinkHref: Href;
}

/**
 * The shared shell for the login and sign-up screens.
 *
 * No card: a deep-teal masthead carries the wordmark and the screen's heading,
 * and the form sits directly on the page below it. The color block is the one
 * deliberate accent — everything under it stays quiet (white, black buttons,
 * grey secondary text) so the two screens read as one product, not two forms.
 */
export function AuthScreenLayout({
  title,
  subtitle,
  error,
  children,
  submitLabel,
  submitLoading,
  onSubmit,
  googleLoading,
  onGoogle,
  footerPrompt,
  footerLinkLabel,
  footerLinkHref,
}: AuthScreenLayoutProps) {
  const { palette, resolved, fontFamily } = useTheme();
  const isDark = resolved === 'dark';

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: palette.mist }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView
        edges={['top']}
        style={[
          styles.masthead,
          {
            backgroundColor: isDark ? palette.surface : palette.teal,
            borderColor: palette.line,
            borderBottomWidth: isDark ? StyleSheet.hairlineWidth : 0,
          },
        ]}>
        <View style={styles.mastheadInner}>
          <Text style={[styles.eyebrow, { color: isDark ? palette.teal : palette.tealOnDark }]}>
            LOKKHYO
          </Text>
          <Text
            style={[
              styles.headline,
              { color: isDark ? palette.ink : '#FFFFFF', fontFamily: fontFamily.displayBold },
            ]}>
            {title}
          </Text>
          <Text
            style={[
              styles.lede,
              { color: isDark ? palette.muted : 'rgba(255,255,255,0.88)', fontFamily: fontFamily.regular },
            ]}>
            {subtitle}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={[styles.form, { backgroundColor: palette.mist }]}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled">
        {children}

        {error ? <Text style={[styles.error, { color: palette.risk }]}>{error}</Text> : null}

        <Button title={submitLabel} onPress={onSubmit} loading={submitLoading} />

        <OrDivider />

        <GoogleButton onPress={onGoogle} loading={googleLoading} />

        <ThemedText style={[styles.footer, { color: palette.muted }]}>
          {footerPrompt}{' '}
          <Link href={footerLinkHref} style={[styles.link, { color: palette.teal, fontFamily: fontFamily.semibold }]}>
            {footerLinkLabel}
          </Link>
        </ThemedText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  masthead: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  mastheadInner: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  eyebrow: {
    fontFamily: 'InterSemiBold',
    fontSize: 12,
    letterSpacing: 3,
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    marginTop: 14,
  },
  lede: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  form: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  error: {
    fontSize: 13,
    marginBottom: 14,
    paddingLeft: 4,
  },
  footer: {
    marginTop: 24,
    fontSize: 14,
  },
  link: {
    fontSize: 14,
  },
});
