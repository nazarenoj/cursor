const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsLogoDir = path.join(__dirname, '../../uploads/logo');
if (!fs.existsSync(uploadsLogoDir)) {
  fs.mkdirSync(uploadsLogoDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsLogoDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg/i;
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;
  if (allowed.test(ext.replace('.', '')) || mimetype === 'image/svg+xml') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP, SVG)'));
  }
};

const uploadLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});

module.exports = uploadLogo;
