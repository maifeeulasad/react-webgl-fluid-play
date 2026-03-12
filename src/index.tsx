/*
Copyright (c) (2022 - infinity) Maifee Ul Asad
*/

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Canvas from './Canvas';

const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const App = () => {
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (!showWelcome) return;
    const timer = setTimeout(() => setShowWelcome(false), 5000);
    return () => clearTimeout(timer);
  }, [showWelcome]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>

      {/* ── Header ── */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: isMobile ? '80px' : '60px',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          padding: isMobile ? '10px 15px' : '0 20px',
          zIndex: 1000,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ marginBottom: isMobile ? '5px' : 0 }}>
          <h1 style={{ color: '#fff', fontSize: isMobile ? '1.2rem' : '1.5rem', margin: 0, fontWeight: 'bold' }}>
            React WebGL Fluid Play
          </h1>
          <p style={{ color: '#fff', opacity: 0.8, margin: 0, fontSize: isMobile ? '0.8rem' : '0.9rem' }}>
            By Maifee Ul Asad
          </p>
        </div>
        <div style={{ color: '#fff', fontSize: isMobile ? '0.7rem' : '0.8rem', opacity: 0.7, textAlign: isMobile ? 'left' : 'right' }}>
          <p style={{ margin: 0 }}>All necessary citations are mentioned in the codebase.</p>
          <p style={{ margin: 0 }}>
            Based on{' '}
            <a
              href="https://github.com/PavelDoGreat/WebGL-Fluid-Simulation"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4fc3f7' }}
            >
              PavelDoGreat's WebGL-Fluid-Simulation
            </a>
          </p>
        </div>
      </div>

      {/* ── Welcome overlay ── */}
      {showWelcome && (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 500,
            backdropFilter: 'blur(5px)',
            cursor: 'pointer',
          }}
          onClick={() => setShowWelcome(false)}
        >
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <h1 style={{ fontSize: isMobile ? '2rem' : '3rem', margin: 0, fontWeight: 'bold' }}>
              Welcome to React WebGL Fluid Play
            </h1>
            <p style={{ fontSize: isMobile ? '1rem' : '1.2rem', opacity: 0.8, margin: '10px 0' }}>
              Interactive fluid simulation by Maifee Ul Asad
            </p>
            <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>Click anywhere or wait to start</p>
          </div>
        </div>
      )}

      {/*
        ── Canvas ──
        showPathManager enables the built-in path-selector button/panel.
        Remove the prop (or set it to false) to get a completely bare canvas.
      */}
      <Canvas showPathManager />

    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);