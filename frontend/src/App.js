import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Friends from './pages/Friends';
import Profile from './pages/Profile';
import CreateGroup from './pages/CreateGroup';
import Settings from './pages/Settings';
import Register from './pages/Register';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Khởi tạo là false
  const [isLoading, setIsLoading] = useState(true); // Thêm trạng thái loading

  useEffect(() => {
    // Kiểm tra token khi ứng dụng khởi động
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setIsLoading(false); // Đã hoàn thành kiểm tra
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return <div>Loading...</div>; // Hiển thị trạng thái loading
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/home" />
            ) : (
              <Login setIsAuthenticated={setIsAuthenticated} />
            )
          }
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/home" /> : <Register />}
        />
        <Route
          path="/home"
          element={
            isAuthenticated ? (
              <Home onLogout={handleLogout} setIsAuthenticated={setIsAuthenticated} /> // Truyền setIsAuthenticated vào Home
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/friends"
          element={isAuthenticated ? <Friends /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
        />
        <Route
          path="/create-group"
          element={
            isAuthenticated ? <CreateGroup /> : <Navigate to="/login" />
          }
        />
        <Route path="*" element={<Navigate to="/login" />} />
        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <Settings setIsAuthenticated={setIsAuthenticated} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;