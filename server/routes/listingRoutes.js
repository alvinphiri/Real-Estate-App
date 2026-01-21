const express = require("express");
// Custom imports
const authController = require("../controllers/authController");
const listingController = require("../controllers/listingController");

const router = express.Router();

router.get("/get", listingController.getListings);
router.get("/listing/:id", listingController.getListing);

// PROTECTED

router.use(authController.protect);

// LANDLORD ONLY
router.post(
  "/",
  authController.requireRole("landlord"),
  listingController.createListing
);

router.get(
  "/:id",
  authController.requireRole("landlord"),
  listingController.getUsersListings
);

router.delete(
  "/:id",
  authController.requireRole("landlord"),
  listingController.deleteListing
);

router.put(
  "/:id",
  authController.requireRole("landlord"),
  listingController.updateListing
);
module.exports = router;