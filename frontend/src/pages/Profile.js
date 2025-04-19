import React, { useState, useEffect, useRef } from 'react';
import { getUserById, updateProfile } from '../services/api';
import '../css/Profile.css';

const Profile = ({ userId, currentUser }) => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    birthDate: '',
    phone: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let userData;
        if (userId && userId !== currentUser?._id) {
          const { data } = await getUserById(userId);
          if (!data) {
            throw new Error('Không tìm thấy người dùng');
          }
          userData = data;
        } else {
          userData = currentUser;
        }

        setUser(userData);
        setFormData({
          name: userData?.name || '',
          address: userData?.address || '',
          birthDate: userData?.birthDate
            ? new Date(userData.birthDate).toISOString().split('T')[0]
            : '',
          phone: userData?.phone || '',
        });
        setPreview(userData?.avatar || 'https://via.placeholder.com/100');
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(
          err.response?.data?.msg ||
            err.message ||
            'Không thể tải thông tin người dùng.'
        );
      }
    };
    if (currentUser) {
      fetchData();
    }
  }, [userId, currentUser]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setError('Chỉ hỗ trợ file ảnh (jpeg, jpg, png)!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
      handleAvatarUpload(file);
    }
  };

  const handleAvatarUpload = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const { data } = await updateProfile(formData);
      setUser(data);
      setPreview(data.avatar || 'https://via.placeholder.com/100');
      setError(null);
      alert('Cập nhật ảnh đại diện thành công!');
    } catch (err) {
      console.error('Lỗi khi tải ảnh lên:', err);
      setError(err.response?.data?.msg || 'Cập nhật ảnh đại diện thất bại.');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('address', formData.address);
      data.append('birthDate', formData.birthDate);

      const { data: updatedUser } = await updateProfile(data);
      setUser(updatedUser);
      setFormData({
        name: updatedUser?.name || '',
        address: updatedUser?.address || '',
        birthDate: updatedUser?.birthDate
          ? new Date(updatedUser.birthDate).toISOString().split('T')[0]
          : '',
        phone: updatedUser?.phone || '',
      });
      setIsEditing(false);
      setError(null);
      alert('Cập nhật thông tin thành công!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.msg || 'Cập nhật thông tin thất bại.');
    }
  };

  const isOwnProfile = user && currentUser && user._id === currentUser._id;

  return (
    <div className="profile-container">
      {error ? (
        <p className="error-message">{error}</p>
      ) : user ? (
        <div className="profile-content">
          <div className="profile-header">
            {isOwnProfile ? (
              <div className="profile-avatar-section">
                <div className="profile-avatar" onClick={handleAvatarClick}>
                  <img src={preview} alt="Avatar" />
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleAvatarChange}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div className="profile-avatar-section">
                <div className="profile-avatar">
                  <img src={preview} alt="Avatar" />
                </div>
              </div>
            )}
            <h2>{user.name}</h2>
          </div>

          {isEditing && isOwnProfile ? (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label>Tên:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={user.email || ''}
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Số điện thoại:</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Nhập số điện thoại"
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Địa chỉ:</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Ngày sinh:</label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                />
              </div>
              <div className="form-actions">
                <button type="submit">Lưu</button>
                <button type="button" onClick={() => setIsEditing(false)}>
                  Hủy
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <p>
                <strong>Tên:</strong> {user.name || 'Chưa cập nhật'}
              </p>
              <p>
                <strong>Email:</strong> {user.email || 'Chưa cập nhật'}
              </p>
              <p>
                <strong>Số điện thoại:</strong>{' '}
                {user.phone || 'Chưa cập nhật'}
              </p>
              <p>
                <strong>Ngày sinh:</strong>{' '}
                {user.birthDate
                  ? new Date(user.birthDate).toLocaleDateString('vi-VN')
                  : 'Chưa cập nhật'}
              </p>
              <p>
                <strong>Địa chỉ:</strong> {user.address || 'Chưa cập nhật'}
              </p>
              {isOwnProfile && (
                <button onClick={() => setIsEditing(true)}>Chỉnh sửa</button>
              )}
            </div>
          )}
        </div>
      ) : (
        <p>Đang tải thông tin...</p>
      )}
    </div>
  );
};

export default Profile;