import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import SubmitPredictions from './pages/SubmitPredictions'
import Predictions from './pages/Predictions'
import MatchDetail from './pages/MatchDetail'
import Leaderboard from './pages/Leaderboard'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/submit" element={<SubmitPredictions />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/match/:journee" element={<MatchDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
