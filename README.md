# react-webgl-fluid-play

[![npm version](https://img.shields.io/npm/v/react-webgl-fluid-play?style=flat-square&logo=npm&color=cb0000)](https://www.npmjs.com/package/react-webgl-fluid-play)
[![npm downloads](https://img.shields.io/npm/dy/react-webgl-fluid-play?style=flat-square&logo=npm&color=cb0000)](https://www.npmjs.com/package/react-webgl-fluid-play)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![React peer dep](https://img.shields.io/badge/react-%5E17.0-61dafb?style=flat-square&logo=react&logoColor=61dafb&labelColor=20232a)](https://reactjs.org)
[![Demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square&logo=github)](https://maifeeulasad.github.io/react-webgl-fluid-play/)


<img width="2559" height="1271" alt="react-webgl-fluid-play by Maifee Ul Asad" src="https://github.com/user-attachments/assets/24ea7aca-35ae-4d2e-9da8-b6d6371993ff" />

---

## Installation

```bash
npm install react-webgl-fluid-play
# or
yarn add react-webgl-fluid-play
# or
pnpm add react-webgl-fluid-play
```

Requires **React 17+** as a peer dependency.

---

## Quick start

```tsx
import Canvas from 'react-webgl-fluid-play';

export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas initialAnimation={{ path: 'oval' }} />
    </div>
  );
}
```

The component fills 100 % of its parent, so wrap it in a positioned container that defines the size you want.

---

## Public exports

```tsx
import Canvas, {
  PathFollower,
  PREDEFINED_PATHS,
  PREDEFINED_PATH_IDS,
  createPredefinedPath,
  getPredefinedPaths,
  type CanvasRef,
  type FluidPath,
  type PredefinedPathId,
} from 'react-webgl-fluid-play';
```

- `Canvas` default export (and named export)
- `PathFollower` class export
- predefined path exports: `PREDEFINED_PATHS`, `PREDEFINED_PATH_IDS`, `createPredefinedPath`, `getPredefinedPaths`, `getPredefinedPath`
- path/type exports: `FluidPath`, `PathPoint`, `PathColor`, `PredefinedPathId`
- canvas API types: `CanvasRef`, `CanvasProps`, `CanvasAnimationOptions`, `CanvasInitialAnimation`

---

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | window width | Fixed pixel width of the canvas. Omit to auto-track the viewport. |
| `height` | `number` | window height | Fixed pixel height of the canvas. Omit to auto-track the viewport. |
| `className` | `string` | — | CSS class applied to the outer wrapper `<div>`. |
| `style` | `React.CSSProperties` | — | Inline styles merged into the outer wrapper `<div>`. |
| `onLoad` | `() => void` | — | Called once the WebGL fluid simulation has successfully initialised. |
| `onError` | `(error: string) => void` | — | Called if WebGL initialisation fails, with a human-readable error message. |
| `showPathManager` | `boolean` | `false` | Show the built-in path-selector button and panel. Omit or set `false` for a completely bare canvas. |
| `initialAnimation` | `{ path: FluidPath \| PredefinedPathId; options?: CanvasAnimationOptions }` | — | Starts a path animation automatically once the simulation is ready. |
| `loadingFallback` | `React.ReactNode` | spinning ring | Rendered while the simulation is initialising. Pass `null` to show nothing. |
| `errorFallback` | `(error: string, retry: () => void) => React.ReactNode` | minimal error + retry button | Rendered when initialisation fails. Receives the error message and a `retry` callback. |

`CanvasAnimationOptions`
- `maxLoops?: number` (`-1` or omitted = infinite)
- `predefinedOverrides?: FluidPathOverrides` (used when path is a predefined id)

---

## Examples

### Bare canvas — no UI whatsoever
```tsx
<Canvas />
```

### With the built-in path manager
```tsx
<Canvas showPathManager />
```

### Start a predefined path on init
```tsx
<Canvas initialAnimation={{ path: 'heart', options: { maxLoops: 1 } }} />
```

### Fixed size
```tsx
<Canvas width={800} height={600} />
```

### Lifecycle callbacks
```tsx
<Canvas
  onLoad={() => console.log('simulation ready')}
  onError={(msg) => console.error('WebGL failed:', msg)}
/>
```

### Custom loading indicator
```tsx
<Canvas loadingFallback={<MySpinner />} />

// hide loading UI entirely
<Canvas loadingFallback={null} />
```

### Custom error UI
```tsx
<Canvas
  errorFallback={(error, retry) => (
    <div>
      <p>{error}</p>
      <button onClick={retry}>Try again</button>
    </div>
  )}
/>
```

### Styled wrapper
```tsx
<Canvas
  className="my-fluid-canvas"
  style={{ borderRadius: '12px', overflow: 'hidden' }}
/>
```

### Use `forwardRef` to trigger animations imperatively
```tsx
import { useRef } from 'react';
import Canvas, { type CanvasRef, createPredefinedPath } from 'react-webgl-fluid-play';

export default function App() {
  const canvasRef = useRef<CanvasRef>(null);

  return (
    <>
      <button onClick={() => canvasRef.current?.playPredefinedPath('infinity')}>Infinity</button>
      <button onClick={() => canvasRef.current?.playPredefinedPath('heart', { maxLoops: 1 })}>
        Heart Once
      </button>
      <button
        onClick={() => {
          const custom = createPredefinedPath('wave', { duration: 3, loop: false });
          canvasRef.current?.playPath(custom);
        }}
      >
        Custom Wave Variant
      </button>
      <button onClick={() => canvasRef.current?.stopPath()}>Stop</button>
      <Canvas ref={canvasRef} />
    </>
  );
}
```

---

## Notes

- **Mobile**: the component automatically uses `window.visualViewport` for accurate dimensions on mobile browsers and prevents default touch scroll/zoom behaviour on the canvas.
- **Dimensions**: when `width`/`height` props are omitted the canvas tracks `window.innerWidth` / `window.innerHeight` (and `visualViewport` on mobile), reacting to resize and orientation-change events.
- **Path coordinates**: custom paths use normalized coordinates (`x`/`y` in `[0,1]`).
- **WebGL**: requires a browser with WebGL support and hardware acceleration enabled. The `onError` callback (or the default error UI) is shown when the context cannot be created.
- **Layout**: the component renders as `position: relative; width: 100%; height: 100%`. Place it inside a container that defines the actual size (e.g. `position: fixed; inset: 0` for full-screen).

---

## License

[MIT](./LICENSE) © Maifee Ul Asad
