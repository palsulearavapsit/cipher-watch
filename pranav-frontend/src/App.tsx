
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ThreatLogs } from './pages/ThreatLogs';
import { BlockchainMonitor } from './pages/BlockchainMonitor';
import { ThreatSimulator } from './pages/ThreatSimulator';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="logs" element={<ThreatLogs />} />
          <Route path="blockchain" element={<BlockchainMonitor />} />
          <Route path="simulator" element={<ThreatSimulator />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;