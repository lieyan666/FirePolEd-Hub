import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Student from './pages/Student';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/student/assignment/:assignmentId" element={<Student />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
