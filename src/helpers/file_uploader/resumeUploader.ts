import multer from "multer";
import path from "path";
import fs from "fs";
import httpStatus from "http-status";
import ApiError from "../../errors/apiError";

// Save uploaded files to the "public/uploads/resumes" folder
const uploadDir = path.join(process.cwd(), "public", "uploads", "resumes");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}-${safeOriginalName}`);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new ApiError(httpStatus.BAD_REQUEST, "Only PDF files are allowed"), false);
  }
};

export const resumeUploader = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});
