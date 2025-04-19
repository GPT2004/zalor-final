import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:5000" : "/",
});
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);

// Thay đổi mật khẩu
export const changePassword = (data) => API.put('/auth/me/password', data);

// Xóa tài khoản
export const deleteAccount = () => API.delete('/auth/me');

// Lấy thông tin người dùng hiện tại
export const getCurrentUser = () => API.get('/users/me');

// Lấy thông tin người dùng theo ID
export const getUserById = (id) => API.get(`/users/${id}`);

// Cập nhật cài đặt
export const updateSettings = (data) => API.put('/auth/me/settings', data);

// Cập nhật thông tin profile
export const updateProfile = (formData) => API.put('/users/me', formData);

// Tìm kiếm người dùng (bạn bè) theo số điện thoại hoặc tên
export const searchUser = (phone, name) => {
  const query = phone ? `phone=${phone}` : name ? `name=${name}` : '';
  return API.get(`/friends/search?${query}`);
};

export const searchFriend = (phone, name) => {
  const query = name ? `name=${name}` : '';
  return API.get(`/friends/search-friends?${query}`);
};

// Gửi lời mời kết bạn
export const sendFriendRequest = (friendId) => API.post('/friends/requests', { friendId });

// Lấy danh sách lời mời kết bạn (nhận được)
export const getFriendRequests = () => API.get('/friends/requests');

// Lấy danh sách bạn bè
export const getFriends = () => API.get('/friends');

// Chấp nhận/từ chối lời mời kết bạn
export const updateFriendRequest = (requestId, status) =>
  API.patch(`/friends/requests/${requestId}`, { status });

// Cập nhật thông tin nhóm (avatar và description)
export const updateGroup = (groupId, data) => API.patch(`/groups/${groupId}`, data);

// Tạo nhóm mới
export const createGroup = (data) => API.post('/groups', data);

// Lấy danh sách nhóm của người dùng (hoặc tìm kiếm nhóm)
export const getGroups = (search = '') => API.get(`/groups${search ? `?search=${search}` : ''}`);

// Thêm thành viên vào nhóm
export const joinGroup = (groupId, userId) => API.post(`/groups/${groupId}/members`, { userId });

// Rời nhóm
export const leaveGroup = (groupId) => API.delete(`/groups/${groupId}/members`);

// Xóa thành viên khỏi nhóm
export const removeMember = (groupId, memberId) => API.delete(`/groups/${groupId}/members/${memberId}`);

// Xóa nhóm
export const deleteGroup = (groupId) => API.delete(`/groups/${groupId}`);

