import React, { useState } from 'react';
import { searchUser, sendFriendRequest } from '../services/api';
import '../css/Friends.css';

const Friends = () => {
  const [query, setQuery] = useState('');
  const [user, setUser] = useState(null);

  const handleSearch = async () => {
    try {
      const { data } = await searchUser(query);
      setUser(data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Tìm kiếm thất bại. Vui lòng thử lại.');
      setUser(null);
    }
  };

  const handleRequest = async (friendId) => {
    try {
      await sendFriendRequest(friendId);
      alert('Gửi lời mời thành công!');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        // Token không hợp lệ, chuyển hướng về trang đăng nhập
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (err.response && err.response.status === 404) {
        alert('API không tồn tại. Vui lòng kiểm tra backend.');
      } else {
        alert(err.response?.data?.error || 'Gửi lời mời thất bại.');
      }
    }
  };

  return (
    <div className="friends-container">
      <div className="friends-header">
        <h2>Tìm kiếm bạn bè</h2>
        <div className="search-bar">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm bằng số điện thoại"
          />
          <button onClick={handleSearch}>Tìm</button>
        </div>
      </div>
      <div className="friends-list">
        {user ? (
          <ul>
            <li>
              <div className="user-info">
                <img
                  src={user.avatar || 'https://via.placeholder.com/50'}
                  alt="Avatar"
                  className="user-avatar"
                />
                <div>
                  <p>{user.name}</p>
                </div>
              </div>
              <button onClick={() => handleRequest(user._id)}>Thêm bạn</button>
            </li>
          </ul>
        ) : (
          <p>Không tìm thấy người dùng nào.</p>
        )}
      </div>
    </div>
  );
};

export default Friends;