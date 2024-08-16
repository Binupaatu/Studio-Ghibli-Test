const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");


router.get("/", courseController.getAllCourses);
router.get("/:id", courseController.getCourseDetails);

module.exports = router;
