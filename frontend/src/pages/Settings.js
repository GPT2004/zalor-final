import React, { useState, useEffect } from 'react';
import { getCurrentUser, changePassword, deleteAccount, updateSettings } from '../services/api';
import '../css/Settings.css';

const Settings = ({ setIsAuthenticated, onClose }) => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
    oldPassword: '',
    newPassword: '',
    doNotDisturb: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await getCurrentUser();
        setUser(data);
        setFormData({
          name: data.name || '',
          avatar: data.avatar || '',
          oldPassword: '',
          newPassword: '',
          doNotDisturb: data.doNotDisturb || false,
        });
      } catch (err) {
        console.error('Error fetching user:', err);
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          onClose(); // Đóng modal nếu token không hợp lệ
        } else {
          setError('Không thể tải thông tin người dùng.');
        }
      }
    };
    fetchUser();
  }, [setIsAuthenticated, onClose]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await changePassword({
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      });
      setSuccess('Thay đổi mật khẩu thành công!');
      setError('');
      setFormData({ ...formData, oldPassword: '', newPassword: '' });
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.msg || 'Thay đổi mật khẩu thất bại.');
      setSuccess('');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.')) {
      try {
        await deleteAccount();
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        onClose(); // Đóng modal sau khi xóa tài khoản
        setSuccess('Tài khoản đã được xóa thành công.');
        setError('');
      } catch (err) {
        console.error('Error deleting account:', err);
        setError(err.response?.data?.msg || 'Xóa tài khoản thất bại.');
        setSuccess('');
      }
    }
  };

  const handleUpdateDoNotDisturb = async () => {
    try {
      const { data } = await updateSettings({ doNotDisturb: formData.doNotDisturb });
      setUser({ ...user, doNotDisturb: data.doNotDisturb });
      setSuccess('Cập nhật chế độ không làm phiền thành công!');
      setError('');
    } catch (err) {
      console.error('Error updating settings:', err);
      setError(err.response?.data?.msg || 'Cập nhật chế độ không làm phiền thất bại.');
      setSuccess('');
    }
  };

  return (
    <div className="settings-modal">
      <div className="settings-modal-content">
        <div className="settings-modal-header">
          <h2>Cài đặt</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        {/* Thay đổi mật khẩu */}
        <div className="settings-section">
          <h3>Thay đổi mật khẩu</h3>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label htmlFor="oldPassword">Mật khẩu cũ:</label>
              <input
                type="password"
                id="oldPassword"
                name="oldPassword"
                value={formData.oldPassword}
                onChange={handleChange}
                placeholder="Nhập mật khẩu cũ"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">Mật khẩu mới:</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Nhập mật khẩu mới"
                required
              />
            </div>
            <button type="submit">Thay đổi mật khẩu</button>
          </form>
        </div>

        {/* Chế độ không làm phiền */}
        <div className="settings-section">
          <h3>Chế độ không làm phiền</h3>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="doNotDisturb"
                checked={formData.doNotDisturb}
                onChange={handleChange}
              />
              Không nhận lời mời kết bạn
            </label>
          </div>
          <button onClick={handleUpdateDoNotDisturb}>Cập nhật</button>
        </div>

        {/* Xóa tài khoản */}
        <div className="settings-section">
          <h3>Xóa tài khoản</h3>
          <p>
            Hành động này sẽ xóa vĩnh viễn tài khoản của bạn và tất cả dữ liệu liên quan.
          </p>
          <button className="delete-account-btn" onClick={handleDeleteAccount}>
            Xóa tài khoản
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;