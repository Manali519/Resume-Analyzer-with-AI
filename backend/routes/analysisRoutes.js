const express = require("express");
const { previewAnalysis, createAnalysis, listAnalyses, deleteAnalysis } = require("../controllers/analysisController");
const { protect } = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post("/preview", asyncHandler(previewAnalysis));

router.use(protect);
router.route("/").get(asyncHandler(listAnalyses)).post(asyncHandler(createAnalysis));
router.delete("/:id", asyncHandler(deleteAnalysis));

module.exports = router;
