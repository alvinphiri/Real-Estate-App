const express = require("express");
const authController = require("../controllers/authController");
const savedSearchController = require("../controllers/savedSearchController");

const router = express.Router();

// All saved searches require auth
router.use(authController.protect);

// Premium + tenant only (single premium feature for MVP)
router.use(authController.requireRole("tenant"));
router.use(authController.requirePremium);

router.post("/", savedSearchController.createSavedSearch);
router.get("/mine", savedSearchController.getMySavedSearches);
router.delete("/:id", savedSearchController.deleteSavedSearch);

module.exports = router;
