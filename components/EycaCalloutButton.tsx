import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { SpringPreset } from '../App';

const blur = (px: number): object =>
  Platform.OS === 'web'
    ? { filter: `blur(${px}px)` }
    : { filter: [{ blur: px }] };

type EycaCalloutButtonProps = {
  deadlineText: string;
  label: string;
  play?: boolean;
  spring?: SpringPreset;
  speed?: number;
  blurEnabled?: boolean;
  xray?: boolean;
  onPress?: () => void;
};

const BUTTON_HEIGHT = 52;
const SHELL_BOTTOM_PADDING = 4;
const EXPANDED_TITLE_HEIGHT = 28;
const EXPANDED_BACKGROUND_HEIGHT = 96;
const SHELL_TOP_PADDING = 8;
const SHELL_GAP = 8;
const BUTTON_CENTER_FROM_BOTTOM = SHELL_BOTTOM_PADDING + BUTTON_HEIGHT / 2;
const TITLE_CENTER_FROM_BOTTOM =
  BUTTON_HEIGHT + (EXPANDED_BACKGROUND_HEIGHT - BUTTON_HEIGHT) / 2;

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SPRING_LIKE_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const TITLE_DELAY = 80;
const BLUR_DURATION = 500;

const DEFAULT_SPRING: SpringPreset = { name: 'Custom', label: 'fr 10 · te 100', friction: 10, tension: 100 };

export function EycaCalloutButton({
  deadlineText,
  label,
  play = false,
  spring = DEFAULT_SPRING,
  speed = 1,
  blurEnabled = true,
  xray = false,
  onPress,
}: EycaCalloutButtonProps) {
  const backgroundHeight = useRef(new Animated.Value(0)).current;
  const backgroundBottom = useRef(new Animated.Value(BUTTON_CENTER_FROM_BOTTOM)).current;
  const backgroundScale = useRef(new Animated.Value(0.92)).current;
  const backgroundRadius = useRef(new Animated.Value(0)).current;
  const titleProgress = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const [blurPx, setBlurPx] = useState(12);

  // Approximate spring settling duration from physics params (for slow-mo timing fallback)
  const springDuration = Math.min(800, 6000 / spring.friction);

  const blurStyle = useMemo(() => {
    if (!blurEnabled) return {};
    return Platform.OS === 'web'
      ? {
          filter: `blur(${blurPx}px)`,
          transition: `filter ${BLUR_DURATION / speed}ms cubic-bezier(0.23, 1, 0.32, 1)`,
        }
      : blur(blurPx);
  }, [blurPx, blurEnabled, speed]);

  const handlePressIn = () => {
    Animated.timing(pressScale, {
      toValue: 0.97,
      duration: 80,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (!play) return;

    const delay = TITLE_DELAY / speed;

    const makeAnim = (value: Animated.Value, toValue: number, native: boolean) =>
      speed === 1
        ? Animated.spring(value, { toValue, friction: spring.friction, tension: spring.tension, useNativeDriver: native })
        : Animated.timing(value, { toValue, duration: springDuration / speed, easing: SPRING_LIKE_EASE, useNativeDriver: native });

    const animation = Animated.parallel([
      makeAnim(backgroundHeight, EXPANDED_BACKGROUND_HEIGHT, false),
      makeAnim(backgroundBottom, 0, false),
      makeAnim(backgroundRadius, 30, false),
      makeAnim(backgroundScale, 1, true),
      Animated.sequence([
        Animated.delay(delay),
        makeAnim(titleProgress, 1, true),
      ]),
    ]);

    const blurTimer = setTimeout(() => setBlurPx(0), delay);
    animation.start();

    return () => {
      animation.stop();
      clearTimeout(blurTimer);
    };
  }, [play, speed, spring, springDuration, backgroundHeight, backgroundBottom, backgroundScale, backgroundRadius, titleProgress]);

  const titleTranslateY = titleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 0],
  });

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.background,
          {
            height: backgroundHeight,
            bottom: backgroundBottom,
            borderRadius: backgroundRadius,
            transform: [{ scale: backgroundScale }],
          },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.superTitleClip,
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: TITLE_CENTER_FROM_BOTTOM - EXPANDED_TITLE_HEIGHT / 2,
            ...blurStyle,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.superTitleRow,
            {
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <ZapIcon />
          <Text style={styles.superTitleBase}>
            Hurry up my guy,{' '}
            <Text style={styles.superTitleAccent}>{deadlineText}</Text>
          </Text>
        </Animated.View>
      </View>

      <View style={[styles.content, xray && { opacity: 0.5 }]}>
        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <ChevronIcon direction="left" />
            <Text style={styles.buttonLabel}>{label}</Text>
            <ChevronIcon direction="right" />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function ZapIcon() {
  return (
    <View style={styles.zapIcon}>
      <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
        <Path
          d="M7.583 1.75 3.5 7h2.917l-.583 5.25L10.5 7H7.583l0-5.25Z"
          stroke="#FFE1E8"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  const rotation = direction === 'left' ? '180deg' : '0deg';

  return (
    <View style={[styles.chevronIcon, { transform: [{ rotate: rotation }] }]}>
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Path
          d="m8.334 5.833 4.167 4.167-4.167 4.167"
          stroke="#FFF4F6"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingHorizontal: 4,
    paddingTop: SHELL_TOP_PADDING + EXPANDED_TITLE_HEIGHT + SHELL_GAP,
    paddingBottom: SHELL_BOTTOM_PADDING,
    justifyContent: 'flex-end',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(93, 1, 44, 0.8)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#4D0024',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  content: {
    zIndex: 1,
  },
  superTitleClip: {
    height: EXPANDED_TITLE_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  superTitleRow: {
    height: EXPANDED_TITLE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  zapIcon: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  superTitleBase: {
    color: '#FFE1E8',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    fontFamily: 'Uncut Sans Variable',
    letterSpacing: -0.28,
  },
  superTitleAccent: {
    color: '#FE5292',
  },
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: 40,
    borderWidth: 0.5,
    borderColor: '#FE5292',
    backgroundColor: '#EB0578',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  buttonPressed: {
    backgroundColor: '#D9046D',
  },
  chevronIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: '#FFF4F6',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    fontFamily: 'Uncut Sans Variable',
  },
});
