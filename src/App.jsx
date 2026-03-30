import React, { useState } from 'react';
import SetupScreen from './components/SetupScreen.jsx';
import InterviewChat from './components/InterviewChat.jsx';
import GapDashboard from './components/GapDashboard.jsx';

export default function App() {
  const [screen, setScreen] = useState('setup');
  const [config, setConfig] = useState(null);

  if (screen === 'setup') {
    return (
      <SetupScreen
        onStart={(cfg) => { setConfig(cfg); setScreen('interview'); }}
        onAnalyze={() => setScreen('gap')}
      />
    );
  }

  if (screen === 'gap') {
    return <GapDashboard onExit={() => setScreen('setup')} />;
  }

  return (
    <InterviewChat
      {...config}
      onExit={() => setScreen('setup')}
    />
  );
}
