import { Navigate, Route, Routes } from 'react-router-dom';
import HostPage from './pages/Host/HostPage';
import HistoryPage from './pages/Host/HistoryPage';
import TVPage from './pages/TV/TVPage';
import JoinPage from './pages/Join/JoinPage';
import ParticipantPage from './pages/Participant/ParticipantPage';

export default function App() {
  return (
    <Routes>
      <Route path="/host" element={<HostPage />} />
      <Route path="/host/history" element={<HistoryPage />} />
      <Route path="/tv" element={<TVPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/participant" element={<ParticipantPage />} />
      <Route path="*" element={<Navigate to="/host" replace />} />
    </Routes>
  );
}
