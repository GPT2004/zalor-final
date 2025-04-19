import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGroup, searchFriend } from '../services/api';
import '../css/CreateGroup.css';

const CreateGroup = () => {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const handleSearchUsers = async () => {
    try {
      const { data } = await searchFriend(null, searchQuery); // Gửi query name thay vì phone
      setSearchedUsers(data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || 'Tìm kiếm người dùng thất bại.');
    }
  };

  const handleAddMember = (user) => {
    if (!selectedMembers.find((member) => member._id === user._id)) {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  const handleRemoveMember = (userId) => {
    setSelectedMembers(selectedMembers.filter((member) => member._id !== userId));
  };

  const handleCreateGroup = async () => {
    try {
      const memberIds = selectedMembers.map((member) => member._id);
      await createGroup({ name: groupName, memberIds });
      alert('Tạo nhóm thành công!');
      navigate('/home');
    } catch (err) {
      console.error('Error creating group:', err);
      if (err.response?.status === 500) {
        alert('Nhóm đã được tạo, nhưng có lỗi xảy ra. Vui lòng kiểm tra danh sách nhóm.');
        navigate('/home');
      } else {
        alert(err.response?.data?.msg || 'Tạo nhóm thất bại.');
      }
    }
  };

  

  return (
    <div className="create-group">
      <div className="create-group-container">
        <div className="create-group-header">
          <h2>Tạo nhóm mới</h2>
        </div>
        <div className="create-group-content">
          <div className="form-group">
            <label>Tên nhóm:</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nhập tên nhóm"
            />
          </div>
          <div className="form-group">
            <label>Thêm thành viên:</label>
            <div className="search-bar">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bạn bè bằng tên"
              />
              <button onClick={handleSearchUsers}>Tìm</button>
            </div>
          </div>
          {searchedUsers.length > 0 && (
            <div className="searched-users">
              <h4>Kết quả tìm kiếm:</h4>
              {searchedUsers.map((user) => (
                <div key={user._id} className="user-item">
                  <span>{user.name}</span>
                  <button onClick={() => handleAddMember(user)}>Thêm</button>
                </div>
              ))}
            </div>
          )}
          {selectedMembers.length > 0 && (
            <div className="selected-members">
              <h4>Thành viên đã chọn:</h4>
              {selectedMembers.map((member) => (
                <div key={member._id} className="member-item">
                  <span>{member.name}</span>
                  <button onClick={() => handleRemoveMember(member._id)}>Xóa</button>
                </div>
              ))}
            </div>
          )}
          <div className="form-actions">
            <button onClick={handleCreateGroup} disabled={!groupName}>Tạo nhóm</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;