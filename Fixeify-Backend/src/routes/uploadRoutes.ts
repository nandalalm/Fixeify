import { Router } from "express";
import { Container } from "inversify";
import { TYPES } from "../types";
import { UploadController } from "../controllers/uploadController";
import { authenticateToken } from "../middleware/authMiddleware";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  }
});

export default function createUploadRoutes(container: Container): Router {
  const router = Router();
  const uploadController = container.get<UploadController>(TYPES.UploadController);

  router.post("/", authenticateToken, upload.single("file"), (req, res, next) => uploadController.uploadFile(req, res, next));

  router.post("/public", upload.single("file"), (req, res, next) => {
    const { folder } = req.body;
    const allowedPublicFolders = ["id-proofs", "profile-photos"];

    if (!folder || !allowedPublicFolders.includes(folder)) {
      res.status(403).json({ message: "Invalid folder for public upload" });
      return;
    }
    uploadController.uploadFile(req, res, next);
  });

  return router;
}
