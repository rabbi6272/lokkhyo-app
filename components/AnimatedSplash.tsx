import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

/**
 * Plays the hello animation over the app on cold start. The native splash is
 * hidden once this has drawn, so there is no blank frame between them; the
 * overlay fades out once the animation has played and the app is `ready`.
 */
export function AnimatedSplash({ ready }: { ready: boolean }) {
  const [played, setPlayed] = useState(false);
  const [gone, setGone] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  // If Lottie never reports finishing (e.g. backgrounded mid-play), don't trap the app behind the overlay.
  useEffect(() => {
    const timer = setTimeout(() => setPlayed(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !played) return;
    Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setGone(true));
  }, [ready, played, opacity]);

  if (gone) return null;

  return (
    <Animated.View
      pointerEvents={ready && played ? 'none' : 'auto'}
      onLayout={() => void SplashScreen.hideAsync()}
      // White, matching the native splash in app.json, so the hand-off is invisible.
      style={[StyleSheet.absoluteFill, styles.container, { opacity }]}>
      <LottieView
        source={require('../assets/hello.json')}
        autoPlay
        loop={false}
        onAnimationFinish={() => setPlayed(true)}
        style={styles.animation}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  animation: { width: 260, height: 260 },
});
