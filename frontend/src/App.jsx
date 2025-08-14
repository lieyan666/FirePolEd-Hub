import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

// Component to redirect to the actual admin page
function AdminRedirect() {
  // Redirect to the actual admin page served by Express
  window.location.href = '/admin';
  return <div>正在跳转到管理后台...</div>;
}

export default App;
