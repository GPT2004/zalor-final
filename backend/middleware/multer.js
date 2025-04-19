const multer = require('multer');
const path = require('path');

// Cấu hình nơi lưu trữ file tạm thời
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'temp/'); // Lưu file tạm vào thư mục temp
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Cấu hình multer
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Mở rộng danh sách định dạng file được hỗ trợ
    const filetypes = /jpeg|jpg|png|mp4|mov|doc|docx|pdf|txt/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    // Kiểm tra mimetype để đảm bảo loại file hợp lệ
    const allowedMimetypes = [
      'image/jpeg', 'image/jpg', 'image/png', // Ảnh
      'video/mp4', 'video/quicktime', // Video (bao gồm .mov)
      'application/pdf', // PDF
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain', // .txt
    ];
    const mimetype = allowedMimetypes.includes(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file ảnh (jpeg, jpg, png), video (mp4, mov), hoặc tài liệu (doc, docx, pdf, txt)!'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn kích thước file: 10MB
});

module.exports = upload;