import React, { useState, useRef } from 'react';
import { searchFriend, joinGroup, getGroups, removeMember, updateGroup } from '../services/api';
import '../css/EditGroup.css';

const EditGroup = ({ group, user, onLeaveGroup, onDeleteGroup, onUpdateGroup }) => {
  const [isMembersDropdownOpen, setIsMembersDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(group.avatar || 'https://via.placeholder.com/100');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState(group.description || '');
  const fileInputRef = useRef(null);

  const toggleMembersDropdown = () => {
    setIsMembersDropdownOpen(!isMembersDropdownOpen);
  };

  const handleSearchUsers = async () => {
    try {
      const { data } = await searchFriend(null, searchQuery);
      setSearchedUsers(data);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.msg || 'Tìm kiếm người dùng thất bại.');
    }
  };

  const handleAddMember = async (groupId, userId) => {
    if (group.members.some(member => member._id === userId)) {
      setErrorMessage('Người dùng này đã là thành viên của nhóm.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Không tìm thấy token, vui lòng đăng nhập lại.');
      const { data } = await joinGroup(groupId, userId);
      onUpdateGroup(data);
      const { data: updatedGroups } = await getGroups();
      const updatedGroup = updatedGroups.find(g => g._id === groupId);
      if (updatedGroup) onUpdateGroup(updatedGroup);
      setSearchedUsers([]);
      setSearchQuery('');
      setErrorMessage('');
      alert('Thêm thành viên thành công!');
    } catch (err) {
      console.error('Lỗi khi thêm thành viên:', err);
      if (err.response?.status === 401) {
        alert('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        setErrorMessage(err.response?.data?.msg || 'Thêm thành viên thất bại.');
      }
    }
  };

  const handleRemoveMember = async (groupId, memberId) => {
    try {
      const { data } = await removeMember(groupId, memberId);
      onUpdateGroup(data);
      alert('Xóa thành viên thành công!');
    } catch (err) {
      console.error('Lỗi khi xóa thành viên:', err);
      setErrorMessage(err.response?.data?.msg || 'Xóa thành viên thất bại.');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setErrorMessage('Chỉ hỗ trợ file ảnh (jpeg, jpg, png)!');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
      handleAvatarUpload(file);
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file) {
      setErrorMessage('Vui lòng chọn một file ảnh.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const { data } = await updateGroup(group._id, formData);
      onUpdateGroup(data);
      setAvatarFile(null);
      setPreview(data.avatar || 'https://via.placeholder.com/100');
      setErrorMessage('');
      alert('Cập nhật ảnh nhóm thành công!');
    } catch (err) {
      console.error('Lỗi khi tải ảnh lên:', err);
      setErrorMessage(err.response?.data?.msg || 'Cập nhật ảnh nhóm thất bại.');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  };

  const handleDescriptionSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await updateGroup(group._id, { description });
      onUpdateGroup(data);
      setIsEditingDescription(false);
      setErrorMessage('');
      alert('Cập nhật mô tả nhóm thành công!');
    } catch (err) {
      console.error('Lỗi khi cập nhật mô tả:', err);
      setErrorMessage(err.response?.data?.msg || 'Cập nhật mô tả nhóm thất bại.');
    }
  };

  return (
    <div className="edit-group-container">
      <div className="group-info-header">
        {group.creator?._id === user?._id ? (
          <div className="group-avatar-section">
            <div className="group-avatar" onClick={handleAvatarClick}>
              <img src={preview} alt="Ảnh đại diện nhóm" />
            </div>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleAvatarChange}
              className="avatar-input"
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div className="group-avatar-section">
            <div className="group-avatar">
              <img src={preview} alt="Ảnh đại diện nhóm" />
            </div>
          </div>
        )}
        <h2>{group.name}</h2>
      </div>

      <div className="group-info-content">
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className="group-description">
          <h4>Mô tả nhóm:</h4>
          {isEditingDescription ? (
            <form onSubmit={handleDescriptionSubmit} className="description-form">
              <textarea
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Nhập mô tả nhóm..."
                rows="3"
              />
              <div className="form-actions">
                <button type="submit">Lưu</button>
                <button type="button" onClick={() => setIsEditingDescription(false)}>
                  Hủy
                </button>
              </div>
            </form>
          ) : (
            <div className="description-display">
              <p>{group.description || 'Chưa có mô tả'}</p>
              {group.creator?._id === user?._id && (
                <button onClick={() => setIsEditingDescription(true)}>Chỉnh sửa</button>
              )}
            </div>
          )}
        </div>

        <div className="members-section">
          <p>Số lượng thành viên: {group.members?.length || 0}</p>
          <button className="dropdown-toggle" onClick={toggleMembersDropdown}>
            {isMembersDropdownOpen ? 'Ẩn thành viên' : 'Hiện thành viên'}
          </button>
          {isMembersDropdownOpen && (
            <div className="members-dropdown">
              {group.members?.length > 0 ? (
                group.members.map((member) => (
                  <div key={member._id} className="member-item">
                    <span>{member.name || 'Không xác định'}</span>
                    {group.creator?._id === user?._id && member._id !== user?._id && (
                      <button
                        className="remove-member-button"
                        onClick={() => handleRemoveMember(group._id, member._id)}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p>Không có thành viên nào.</p>
              )}
            </div>
          )}
        </div>

        {group.creator?._id === user?._id ? (
          <div className="admin-actions">
            <div className="add-member-section">
              <h4>Thêm thành viên</h4>
              <div className="search-bar">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm bạn bè bằng tên"
                />
                <button onClick={handleSearchUsers}>Tìm</button>
              </div>
              {searchedUsers.length > 0 && (
                <div className="searched-users">
                  {searchedUsers.map((user) => (
                    <div key={user._id} className="user-item">
                      <span>{user.name}</span>
                      <button onClick={() => handleAddMember(group._id, user._id)}>
                        Thêm
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              className="delete-group-button"
              onClick={() => onDeleteGroup(group._id)}
            >
              Xóa nhóm
            </button>
          </div>
        ) : (
          <button
            className="leave-group-button"
            onClick={() => onLeaveGroup(group._id)}
          >
            Rời nhóm
          </button>
        )}
      </div>
    </div>
  );
};

export default EditGroup;