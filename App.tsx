import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';

import { EycaCalloutButton } from './components/EycaCalloutButton';
import { PromotionalBannerStack } from './components/PromotionalBannerStack';

export type SpringPreset = {
  name: string;
  label: string;
  friction: number;
  tension: number;
};

const SPRING_PRESETS: SpringPreset[] = [
  { name: 'Gentle',   label: 'Smooth, no overshoot',  friction: 18, tension: 100 },
  { name: 'Snappy',   label: 'Fast, clean settle',     friction: 10, tension: 200 },
  { name: 'Bouncy',   label: 'Slight overshoot',       friction: 5,  tension: 150 },
  { name: 'Stiff',    label: 'Rigid, immediate',       friction: 20, tension: 400 },
  { name: 'Wobbly',   label: 'Obvious bounce',         friction: 3,  tension: 180 },
  { name: 'Molasses', label: 'Slow, deliberate',       friction: 25, tension: 50  },
  { name: 'Custom',   label: 'fr 10 · te 100',         friction: 10, tension: 100 },
];

const DEFAULT_SPRING = SPRING_PRESETS[SPRING_PRESETS.length - 1]; // Custom

export default function App() {
  const [tab, setTab] = useState<'button' | 'playground'>('button');
  const [key, setKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<SpringPreset>(DEFAULT_SPRING);
  const [open, setOpen] = useState(false);
  const [friction, setFriction] = useState(DEFAULT_SPRING.friction);
  const [tension, setTension] = useState(DEFAULT_SPRING.tension);
  const [xray, setXray] = useState(false);
  const [blurEnabled, setBlurEnabled] = useState(true);
  const [speed, setSpeed] = useState<1 | 0.5 | 0.1>(1);

  const cycleSpeed = () => setSpeed(s => s === 1 ? 0.5 : s === 0.5 ? 0.1 : 1);
  const replayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonPhaseRef = useRef<'reset' | 'play'>('reset');
  const [buttonPhase, setButtonPhase] = useState<'reset' | 'play'>('reset');

  const advancePhase = (phase: 'reset' | 'play') => {
    buttonPhaseRef.current = phase;
    setButtonPhase(phase);
  };

  const replay = () => {
    setPlaying(false);
    setKey(k => k + 1);
    if (replayTimer.current) clearTimeout(replayTimer.current);
    replayTimer.current = setTimeout(() => {
      setPlaying(true);
      advancePhase('reset');
    }, 80);
  };

  const pickSpring = (preset: SpringPreset) => {
    setOpen(false);
    setSelected(preset);
    setFriction(preset.friction);
    setTension(preset.tension);
    replay();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'button' && styles.tabActive]}
          onPress={() => setTab('button')}
        >
          <Text style={[styles.tabLabel, tab === 'button' && styles.tabLabelActive]}>Button</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'playground' && styles.tabActive]}
          onPress={() => setTab('playground')}
        >
          <Text style={[styles.tabLabel, tab === 'playground' && styles.tabLabelActive]}>Playground</Text>
        </Pressable>
      </View>

      {tab === 'playground' && (
        <View style={styles.placeholder}>
          <PromotionalBannerStack />
        </View>
      )}

      {tab === 'button' && <>
      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [
            styles.controlButton,
            buttonPhase === 'play' && styles.playButton,
            pressed && styles.controlButtonPressed,
          ]}
          onPress={() => {
            if (buttonPhaseRef.current === 'reset') {
              setPlaying(false);
              setKey(k => k + 1);
              advancePhase('play');
            } else {
              setPlaying(true);
              advancePhase('reset');
            }
          }}
        >
          <Text style={[styles.controlLabel, buttonPhase === 'play' && styles.playLabel]}>
            {buttonPhase === 'reset' ? 'Reset' : 'Play'}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.controlButton, speed !== 1 && styles.activeButton, pressed && styles.controlButtonPressed]}
          onPress={cycleSpeed}
        >
          <Text style={[styles.controlLabel, speed !== 1 && styles.activeLabel]}>
            {speed === 1 ? '1x' : speed === 0.5 ? '0.5x' : '0.1x'}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.controlButton, !blurEnabled && styles.activeButton, pressed && styles.controlButtonPressed]}
          onPress={() => setBlurEnabled(b => !b)}
        >
          <Text style={[styles.controlLabel, !blurEnabled && styles.activeLabel]}>Blur</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.controlButton, xray && styles.activeButton, pressed && styles.controlButtonPressed]}
          onPress={() => setXray(x => !x)}
        >
          <Text style={[styles.controlLabel, xray && styles.activeLabel]}>X-ray</Text>
        </Pressable>
      </View>

      <View style={styles.previewArea}>
        <EycaCalloutButton
          key={key}
          play={playing}
          deadlineText="4 days left!"
          label="Nadaljuj"
          spring={{ ...selected, friction, tension }}
          speed={speed}
          blurEnabled={blurEnabled}
          xray={xray}
          onPress={() => {
            if (buttonPhaseRef.current === 'reset') {
              setPlaying(false);
              setKey(k => k + 1);
              advancePhase('play');
            } else {
              setPlaying(true);
              advancePhase('reset');
            }
          }}
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.dropdownTriggerPressed]}
        onPress={() => setOpen(true)}
      >
        <View style={styles.dropdownTriggerText}>
          <Text style={styles.dropdownName}>{selected.name}</Text>
          <Text style={styles.dropdownSub}>{selected.label}</Text>
        </View>
        <Text style={styles.dropdownParams}>fr {selected.friction} · te {selected.tension}</Text>
        <Text style={styles.dropdownChevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Spring preset</Text>
            <FlatList
              data={SPRING_PRESETS}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => {
                const isSelected = item.name === selected.name;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.item,
                      isSelected && styles.itemSelected,
                      pressed && styles.itemPressed,
                    ]}
                    onPress={() => pickSpring(item)}
                  >
                    <View>
                      <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemSub}>{item.label}</Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={[styles.itemParams, isSelected && styles.itemParamsSelected]}>
                        fr {item.friction} · te {item.tension}
                      </Text>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.listContent}
            />
          </View>
        </Pressable>
      </Modal>

      <View style={styles.sliders}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Friction</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={30}
            step={1}
            value={friction}
            onValueChange={setFriction}
            onSlidingComplete={replay}
            minimumTrackTintColor="#1A1A1A"
            maximumTrackTintColor="#D0D0CE"
            thumbTintColor="#1A1A1A"
          />
          <Text style={styles.sliderValue}>{friction}</Text>
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Tension</Text>
          <Slider
            style={styles.slider}
            minimumValue={10}
            maximumValue={500}
            step={5}
            value={tension}
            onValueChange={setTension}
            onSlidingComplete={replay}
            minimumTrackTintColor="#1A1A1A"
            maximumTrackTintColor="#D0D0CE"
            thumbTintColor="#1A1A1A"
          />
          <Text style={styles.sliderValue}>{tension}</Text>
        </View>
      </View>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FDFDFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 24,
  },
  controls: {
    position: 'absolute',
    top: 60,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  previewArea: {
    width: '100%',
    maxWidth: 361.3,
  },
  controlButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8E8E6',
  },
  playButton: {
    backgroundColor: '#1A1A1A',
  },
  activeButton: {
    backgroundColor: '#1A1A1A',
  },
  controlButtonPressed: {
    opacity: 0.7,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  playLabel: {
    color: '#FFF',
  },
  activeLabel: {
    color: '#FFF',
  },
  tabs: {
    position: 'absolute',
    top: 60,
    left: 16,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#EFEFED',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },
  tabLabelActive: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
  },
  sliders: {
    width: '100%',
    maxWidth: 361.3,
    gap: 8,
    paddingHorizontal: 4,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    width: 58,
  },
  slider: {
    flex: 1,
    height: 32,
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    width: 32,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F0F0EE',
    width: '100%',
    maxWidth: 361.3,
  },
  dropdownTriggerPressed: {
    opacity: 0.7,
  },
  dropdownTriggerText: {
    flex: 1,
    gap: 2,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  dropdownSub: {
    fontSize: 12,
    color: '#888',
  },
  dropdownParams: {
    fontSize: 12,
    color: '#888',
    fontVariant: ['tabular-nums'],
  },
  dropdownChevron: {
    fontSize: 16,
    color: '#888',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FDFDFC',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '72%',
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D0CE',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  itemSelected: {
    backgroundColor: '#F0EDF2',
  },
  itemPressed: {
    backgroundColor: '#EFEFED',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  itemNameSelected: {
    fontWeight: '700',
    color: '#6B21A8',
  },
  itemSub: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemParams: {
    fontSize: 12,
    color: '#999',
    fontVariant: ['tabular-nums'],
  },
  itemParamsSelected: {
    color: '#6B21A8',
  },
  checkmark: {
    fontSize: 16,
    color: '#6B21A8',
    fontWeight: '700',
  },
});
