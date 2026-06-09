# PromotionalBannerStack — Developer Handoff

## Overview

A swipeable, auto-rotating stacked banner component built with React Native's `Animated` API. Cards are rendered in a perspective stack — each layer is slightly smaller and higher than the one in front. Swiping or tapping the close button dismisses the front card; all other cards simultaneously animate toward the viewer while a new card slides in from behind.

---

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `cardCount` | `number` | `3` | Number of distinct banner cards |
| `autoRotateMs` | `number` | — | If set, auto-dismisses the front card on this interval (ms) |
| `timerProgressAnim` | `Animated.Value` | — | External animated value driven from 1→0 over each auto-rotate interval; wire to a progress bar |
| `onClose` | `() => void` | — | Called after each dismiss animation completes |

**Usage example**
```tsx
<PromotionalBannerStack
  cardCount={3}
  autoRotateMs={4000}
  timerProgressAnim={progressAnim}
  onClose={() => console.log('card dismissed')}
/>
```

---

## Behaviour by card count

### `cardCount === 1`

- Renders a single, full-width banner card.
- **No** indicator dots.
- **No** auto-rotate (interval is never started).
- **No** swipe-to-dismiss — horizontal drag gestures are ignored.
- **Press-down scale effect is active**: tapping the card scales it to `0.97` and springs back on release, giving tactile feedback for a tap action.
- The close button is rendered but wired to `undefined` (no dismiss action).
- No `bannerTop` offset — the card sits flush at the top of its container.

### `cardCount === 2`

- Renders **2 visible cards** at all times: one front card, one back card peeking above it.
- A hidden third slot (slot C) is pre-positioned below the back card and slides in simultaneously whenever a card is dismissed.
- Uses a **3-slot cycle** (`a → b → c → a`) internally so the incoming card animation has its own slot and never conflicts with the fly-off.
- Indicator dots shown (2 dots).
- Auto-rotate, swipe-to-dismiss, press effect, and close button all work identically to the 3+ card case.

### `cardCount >= 3`

- Renders **3 visible cards** at all times: front, back, and a smaller far-back card.
- A hidden fourth slot (slot D) is pre-positioned below the far-back card. On dismiss, it slides in simultaneously as the new far-back while the other cards all promote forward.
- Uses a **4-slot cycle** (`a → b → c → d → a`).
- All features active.

---

## Layout

The component is designed to span the **full window width** with 16 px padding on each side accounted for internally:

```
|←16px→|←————— bannerWidth (windowWidth − 32) —————→|←16px→|
  dots                     stack                      spacer
```

- The **dots column** (left, 16 px wide) vertically aligns the indicator dots with the front card.
- The **stack** holds all card slots with `position: absolute` inside.
- The **spacer** (right, 16 px wide) mirrors the dots column so the stack stays centred.
- When `cardCount === 1`, the dots column is replaced by an identical 16 px spacer so the single card occupies the same horizontal position.

The parent container should negate any horizontal padding to give the component the full window width:

```tsx
// App.tsx — the placeholder that hosts the banner
placeholder: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  marginHorizontal: -16,   // cancels screen paddingHorizontal: 16
},
```

The root `<View>` of the app screen also needs `overflow: 'hidden'` to prevent the browser from expanding the scroll area during the fly-off animation:

```tsx
screen: {
  flex: 1,
  overflow: 'hidden',
  ...
},
```

---

## Dimensions (all responsive)

All measurements scale from a 361 px design baseline:

```ts
const bannerWidth  = windowWidth - 32          // full width minus 16px each side
const ratio        = bannerWidth / 361          // scale factor
const bannerHeight = Math.round(134 * ratio)    // card height
const bannerTop    = Math.round(40 * ratio)     // vertical offset for stack peek effect
const backY        = -23.5 * ratio              // translateY of the back card
const backY2       = backY * 2                  // translateY of the far-back card
```

Scale constants are dimensionless ratios — they do **not** change with screen size:

```ts
const BACK_SCALE   = 337 / 361    // ~0.9336 — back card scale
const BACK_SCALE_2 = BACK_SCALE²  // ~0.8716 — far-back card scale
```

---

## Slot system

Cards are not re-mounted on each dismiss — animated values are recycled across 4 fixed slots (`a`, `b`, `c`, `d`). A `frontSlotRef` tracks which slot is currently the front card; the others are derived:

| Role | 1 card | 2 cards (3-slot cycle) | 3+ cards (4-slot cycle) |
|---|---|---|---|
| front | `a` | `a` | `a` |
| back | — | `next3[front]` | `NEXT_SLOT[front]` |
| farBack | — | — | `NEXT_SLOT[NEXT_SLOT[front]]` |
| entry | — | `next3[next3[front]]` | `NEXT_SLOT[NEXT_SLOT[NEXT_SLOT[front]]]` |

After each dismiss the cycle advances by one step and the old front slot is teleported to the entry start position (opacity 0) ready for the next cycle.

**Initial animated values per slot:**

| Slot | Role | `ty` | `sc` | `op` |
|---|---|---|---|---|
| A | front | `0` | `1` | `1` |
| B | back | `backY` | `BACK_SCALE` | `1` |
| C (3+ cards) | farBack | `backY2` | `BACK_SCALE_2` | `1` |
| C (2 cards) | entry | `backY + 32*ratio` | `BACK_SCALE` | `0` |
| D (3+ cards) | entry | `backY2 + 32*ratio` | `BACK_SCALE_2` | `0` |

---

## Dismiss animation

All animations in a single `Animated.parallel` — nothing is staggered or delayed:

| Target | From | To | Duration |
|---|---|---|---|
| `front.tx` | `0` | `±(bannerWidth + 50)` | 300 ms |
| `back.ty` | `backY` | `0` | 500 ms |
| `back.sc` | `BACK_SCALE` | `1` | 500 ms |
| `farBack.ty` *(3+ cards only)* | `backY2` | `backY` | 500 ms |
| `farBack.sc` *(3+ cards only)* | `BACK_SCALE_2` | `BACK_SCALE` | 500 ms |
| `entry.op` | `0` | `1` | 150 ms |
| `entry.ty` | `entryTY` | `backY2` *(3+ cards)* / `backY` *(2 cards)* | 500 ms |

Easing for all: `Easing.bezier(0.33, 1, 0.68, 1)` (ease-out cubic).

At the `parallel` callback (t = 500 ms):
1. `frontSlotRef` advances one step in the cycle.
2. The recycled slot gets the next card index and is teleported to the entry start position with `opacity: 0`.
3. `setFrontSlot` / `setSlotCardIndex` trigger a re-render with the new role assignments.

---

## Stale closure pattern

`PanResponder.create` is called once at mount; its callbacks never re-run. Any value that changes between renders must be accessed through a mutable ref:

```ts
const bannerWidthRef   = useRef(bannerWidth);   bannerWidthRef.current   = bannerWidth;
const backYRef         = useRef(backY);          backYRef.current         = backY;
const backY2Ref        = useRef(backY2);         backY2Ref.current        = backY2;
const entryTYRef       = useRef(entryTY);        entryTYRef.current       = entryTY;
const entry2TYRef      = useRef(entry2TY);       entry2TYRef.current      = entry2TY;
const dismissDistanceRef = useRef(dismissDistance); dismissDistanceRef.current = dismissDistance;
const cardCountRef     = useRef(cardCount);      cardCountRef.current     = cardCount;
```

`handleDismiss` and `handleSnapBack` are also updated each render via `handleDismissRef.current = handleDismiss` / `handleSnapBackRef.current = handleSnapBack` so panResponder callbacks always invoke the latest version with fresh closure values.

---

## Implementing the real banner content

The `renderSlot` function currently renders a coloured placeholder with a card number. Replace its inner JSX with the real content:

```tsx
const renderSlot = (slot: SlotName, position: 'front' | 'back' | 'farBack' | 'entry') => {
  const isFront = position === 'front';
  const { tx, ty, sc, op, combinedScale } = slots[slot];
  const cardIdx = slotCardIndex[slot];   // 0-based index into your banners array

  // ... transform / rotation logic unchanged ...

  return (
    <Animated.View
      key={slot}
      {...(isFront ? panResponder.panHandlers : {})}
      style={[
        styles.banner,
        { top: effectiveBannerTop, width: bannerWidth, height: bannerHeight },
        { transform: transforms, opacity: op },
      ]}
    >
      {/* Replace everything below with real content */}
      <BannerCard data={banners[cardIdx]} />
      {isFront && cardCount >= 2 && (
        <CloseButton onPress={() => handleDismiss(1)} />
      )}
    </Animated.View>
  );
};
```

Pass an array of banner data objects as a prop and index into it with `slotCardIndex[slot]`.

---

## Checklist for integration

- [ ] Replace placeholder card colours and numbers with real `BannerCard` content
- [ ] Pass `cardCount={banners.length}` so the component adapts to the actual data
- [ ] Connect `timerProgressAnim` to the progress bar in the design (if required)
- [ ] Wire `onClose` to any analytics/state that needs to know a card was dismissed
- [ ] Ensure the parent screen has `overflow: 'hidden'` to suppress scroll-expand during fly-off
- [ ] Ensure the banner's parent container uses `marginHorizontal: -16` to let the component span full width
- [ ] Verify on both narrow (320 px) and wide (430 px+) viewports — all dimensions scale via `ratio`
