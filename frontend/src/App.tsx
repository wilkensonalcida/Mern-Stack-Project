import { Route, Routes } from 'react-router';
import LandingPage from './pages/LandingPage';
import JoinPage from './pages/JoinPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HostPage from './pages/HostPage';
import PlayPage from './pages/PlayPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/play/:sessionCode" element={<PlayPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/host" element={<HostPage />} />
    </Routes>
  )
};

const fetchGameStatus = async () => {
  try {
    const response = await fetch('http://localhost:5001/api/');
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error("Error connecting to backend:", error);
  }
};
