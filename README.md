# react-webgl-fluid-play

NPM: https://www.npmjs.com/package/react-webgl-fluid-play

Demo: https://maifeeulasad.github.io/react-webgl-fluid-play/


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
      <Canvas />
    </div>
  );
}
```

The component fills 100 % of its parent, so wrap it in a positioned container that defines the size you want.

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
| `loadingFallback` | `React.ReactNode` | spinning ring | Rendered while the simulation is initialising. Pass `null` to show nothing. |
| `errorFallback` | `(error: string, retry: () => void) => React.ReactNode` | minimal error + retry button | Rendered when initialisation fails. Receives the error message and a `retry` callback. |

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

---

## Notes

- **Mobile**: the component automatically uses `window.visualViewport` for accurate dimensions on mobile browsers and prevents default touch scroll/zoom behaviour on the canvas.
- **Dimensions**: when `width`/`height` props are omitted the canvas tracks `window.innerWidth` / `window.innerHeight` (and `visualViewport` on mobile), reacting to resize and orientation-change events.
- **WebGL**: requires a browser with WebGL support and hardware acceleration enabled. The `onError` callback (or the default error UI) is shown when the context cannot be created.
- **Layout**: the component renders as `position: relative; width: 100%; height: 100%`. Place it inside a container that defines the actual size (e.g. `position: fixed; inset: 0` for full-screen).

---

## License

[MIT](./LICENSE) © Maifee Ul Asad
