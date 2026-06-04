import { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';

const BANNER_WIDTH = 361;
const DISMISS_VELOCITY = 0.3;
const DISMISS_DISTANCE = 100;

// Both slots use front banner CSS (left:0, top:19, w:361, h:134).
// The "back" visual is achieved by transform:
//   Center of front:  (180.5, 86)
//   Center of back:   (180.5, 62.5)  → translateY = -23.5
//   Scale:            337/361 ≈ 0.934
const BACK_Y = -23.5;
const BACK_SCALE = 337 / 361;

function CloseButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
        <Line x1="18" y1="6" x2="6" y2="18" stroke="#78716C" strokeWidth="2" strokeLinecap="round" />
        <Line x1="6" y1="6" x2="18" y2="18" stroke="#78716C" strokeWidth="2" strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

type PromotionalBannerStackProps = {
  onClose?: () => void;
};

export function PromotionalBannerStack({ onClose }: PromotionalBannerStackProps) {
  // Track which slot is currently the front (for render order + color)
  const frontSlotRef = useRef<'a' | 'b'>('a');
  const [frontSlot, setFrontSlot] = useState<'a' | 'b'>('a');

  // Slot A — starts as front
  const aTX = useRef(new Animated.Value(0)).current;
  const aTY = useRef(new Animated.Value(0)).current;
  const aSc = useRef(new Animated.Value(1)).current;
  const aOp = useRef(new Animated.Value(1)).current;

  // Slot B — starts as back
  const bTX = useRef(new Animated.Value(0)).current;
  const bTY = useRef(new Animated.Value(BACK_Y)).current;
  const bSc = useRef(new Animated.Value(BACK_SCALE)).current;
  const bOp = useRef(new Animated.Value(1)).current;

  const getFront = () => frontSlotRef.current === 'a'
    ? { tx: aTX, ty: aTY, sc: aSc, op: aOp }
    : { tx: bTX, ty: bTY, sc: bSc, op: bOp };

  const getBack = () => frontSlotRef.current === 'a'
    ? { tx: bTX, ty: bTY, sc: bSc, op: bOp }
    : { tx: aTX, ty: aTY, sc: aSc, op: aOp };

  const handleDismiss = (dx: number) => {
    const front = getFront();
    const back = getBack();
    const direction = dx >= 0 ? 1 : -1;

    Animated.timing(front.tx, {
      toValue: direction * (BANNER_WIDTH + 50),
      duration: 240,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start(() => {
      onClose?.();

      // Promote back → front
      Animated.parallel([
        Animated.spring(back.ty, { toValue: 0, friction: 7, tension: 100, useNativeDriver: true }),
        Animated.spring(back.sc, { toValue: 1, friction: 7, tension: 100, useNativeDriver: true }),
      ]).start();

      // Teleport dismissed card to back position (invisible, off-screen)
      front.tx.setValue(0);
      front.ty.setValue(BACK_Y);
      front.sc.setValue(BACK_SCALE);
      front.op.setValue(0);

      // Fade it back in as the new back card
      Animated.timing(front.op, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      // Swap roles
      const next = frontSlotRef.current === 'a' ? 'b' : 'a';
      frontSlotRef.current = next;
      setFrontSlot(next);
    });
  };

  const handleSnapBack = () => {
    Animated.spring(getFront().tx, {
      toValue: 0,
      friction: 7,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6,
      onPanResponderMove: (_, { dx }) => getFront().tx.setValue(dx),
      onPanResponderRelease: (_, { dx, vx }) => {
        if (Math.abs(vx) > DISMISS_VELOCITY || Math.abs(dx) > DISMISS_DISTANCE) {
          handleDismiss(dx);
        } else {
          handleSnapBack();
        }
      },
      onPanResponderTerminate: handleSnapBack,
    })
  ).current;

  const renderSlot = (isA: boolean, isFront: boolean) => {
    const tx = isA ? aTX : bTX;
    const ty = isA ? aTY : bTY;
    const sc = isA ? aSc : bSc;
    const op = isA ? aOp : bOp;

    // Front card: swipe opacity + rotation; back card: none
    const swipeOp = isFront
      ? tx.interpolate({
          inputRange: [-BANNER_WIDTH * 0.8, 0, BANNER_WIDTH * 0.8],
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        })
      : null;

    const rotation = isFront
      ? tx.interpolate({
          inputRange: [-BANNER_WIDTH, 0, BANNER_WIDTH],
          outputRange: ['-6deg', '0deg', '6deg'],
          extrapolate: 'clamp',
        })
      : null;

    const combinedOp = swipeOp ? Animated.multiply(swipeOp, op) : op;

    // Colors: front = lighter, back = darker (swap with roles)
    const isFrontSlotA = frontSlot === 'a';
    const isCurrentlyFront = isA === isFrontSlotA;
    const color = isCurrentlyFront ? '#d6d3d1' : '#a8a29e';

    const transforms: object[] = [{ translateY: ty }, { scale: sc }];
    if (isFront) {
      transforms.unshift({ translateX: tx });
      if (rotation) transforms.push({ rotate: rotation });
    }

    return (
      <Animated.View
        key={isA ? 'a' : 'b'}
        {...(isFront ? panResponder.panHandlers : {})}
        style={[
          styles.banner,
          { backgroundColor: color },
          { transform: transforms, opacity: combinedOp },
        ]}
      >
        <CloseButton onPress={isFront ? () => handleDismiss(1) : undefined} />
        <Text selectable={false} style={styles.slotLabel}>{isA ? '1' : '2'}</Text>
      </Animated.View>
    );
  };

  const frontIsA = frontSlot === 'a';

  return (
    <View style={styles.stack}>
      {renderSlot(!frontIsA, false)}
      {renderSlot(frontIsA, true)}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: BANNER_WIDTH,
    height: 153,
  },
  banner: {
    position: 'absolute',
    left: 0,
    top: 19,
    width: BANNER_WIDTH,
    height: 134,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  slotLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -20 }],
    fontSize: 28,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.2)',
  },
  closeButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.273,
    borderColor: '#f5f5f4',
    borderRadius: 69,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
