import React, { useState } from 'react';
import SetupScreen from './components/SetupScreen.jsx';
import InterviewChat from './components/InterviewChat.jsx';

export default function App() {
  const [screen, setScreen] = useState('setup');
  const [config, setConfig] = useState(null);

  if (screen === 'setup') {
    return (
      <SetupScreen
        onStart={(cfg) => {
          setConfig(cfg);
          setScreen('interview');
        }}
      />
    );
  }

  return (
    <InterviewChat
      {...config}
      onExit={() => setScreen('setup')}
    />
  );
}
