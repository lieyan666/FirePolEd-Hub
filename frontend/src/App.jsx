import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AssignmentDetail from './pages/AssignmentDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student/assignment/:id" element={<AssignmentDetail />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
