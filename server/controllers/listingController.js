// Custom Imports
const catchAsync = require("../utils/catchAsync");
const Listing = require("../models/listingModel");
const AppError = require("../utils/appError");
const SavedSearch = require("../models/savedSearchModel");
const User = require("../models/userModel");
const { sendEmail } = require("../utils/email");

const normalizeListingPayload = (body) => {
  // Backwards compat: frontend may send regularPrice/discountedPrice.
  const payload = { ...body };
  if (payload.regularPrice != null && payload.monthlyRent == null) {
    payload.monthlyRent = payload.regularPrice;
  }
  // Do not persist discountedPrice if not needed; keep if present.
  return payload;
};

const matchesSavedSearch = (search, listing) => {
  const c = search.criteria || {};
  const loc = (c.location || "").trim().toLowerCase();
  if (loc) {
    const listingLoc = (listing.location || "").toLowerCase();
    if (!listingLoc.includes(loc)) return false;
  }

  const rent = Number(listing.monthlyRent || 0);
  const minRent = Number(c.minRent || 0);
  const maxRent = Number(c.maxRent || 0);
  if (minRent && rent < minRent) return false;
  if (maxRent && rent > maxRent) return false;

  const beds = Number(listing.bedrooms || 0);
  const minBeds = Number(c.minBedrooms || 0);
  if (minBeds && beds < minBeds) return false;

  const wantedAmenities = (c.amenities || {});
  const listingAmenities = listing.amenities || {};
  for (const key of Object.keys(wantedAmenities)) {
    if (wantedAmenities[key] === true && listingAmenities[key] !== true) {
      return false;
    }
  }
  return true;
};

exports.createListing = catchAsync(async (req, res, next) => {
  // 1) Create a listing
  const newListing = await Listing.create(normalizeListingPayload(req.body));

  // 1b) Trigger saved-search alerts (email) for premium tenants
  try {
    const activeSearches = await SavedSearch.find({ isActive: true }).populate(
      "user",
      "email premiumStatus"
    );
    const matches = activeSearches.filter(
      (s) => s.user && s.user.premiumStatus && matchesSavedSearch(s, newListing)
    );
    // Fire-and-forget style (but awaited in try for simplicity)
    for (const s of matches) {
      const to = s.user.email;
      await sendEmail({
        to,
        subject: "New property matching your saved search",
        text: `A new property was listed in ${newListing.location} for ${newListing.monthlyRent}. Open the app to view details.`,
      });
      s.lastNotifiedAt = new Date();
      await s.save({ validateBeforeSave: false });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("[saved-search-alerts]", e?.message || e);
  }

  // 2) Send the response
  res.status(201).json({
    status: "success",
    data: {
      listing: newListing,
    },
  });
});

exports.getUsersListings = catchAsync(async (req, res, next) => {
  // 1) Find all listings based on user id
  const listings = await Listing.find({ user: req.params.id });

  // 2) Send the response
  res.status(200).json({
    status: "success",
    results: listings.length,
    data: listings,
  });
});

exports.getListing = catchAsync(async (req, res, next) => {
  // 1) Find the listing
  const listing = await Listing.findById(req.params.id);

  // 2) Check if the listing exists
  if (!listing) {
    return next(new AppError("No listing found with that ID", 404));
  }

  // 3) Send the response
  res.status(200).json({
    status: "success",
    data: listing,
  });
});

exports.deleteListing = catchAsync(async (req, res, next) => {
  // 1) Find the listing
  const listing = await Listing.findById(req.params.id);

  // 2) Check if the listing exists
  if (!listing) {
    return next(new AppError("No listing found with that ID", 404));
  }

  // 3) Check if the user owns the listing
  if (listing.user.toString() !== req.user.id) {
    return next(new AppError("You do not own this listing", 403));
  }

  // 4) Delete the listing
  await Listing.findByIdAndDelete(req.params.id);

  // 4) Send the response
  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.updateListing = catchAsync(async (req, res, next) => {
  // 1) Find the listing
  const listing = await Listing.findById(req.params.id);

  // 2) Check if the listing exists
  if (!listing) {
    return next(new AppError("No listing found with that ID", 404));
  }

  // 3) Check if the user owns the listing
  if (listing.user.toString() !== req.user.id) {
    return next(new AppError("You do not own this listing", 403));
  }

  // 4) Update the listing
  const updatedListing = await Listing.findByIdAndUpdate(
    req.params.id,
    normalizeListingPayload(req.body),
    {
      new: true,
      runValidators: true,
    }
  );

  // 5) Send the response
  res.status(200).json({
    status: "success",
    data: updatedListing,
  });
});

exports.getListings = catchAsync(async (req, res, next) => {
  // 1) Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 6;
  const skip = (page - 1) * limit;

  // 2) Sorting
  // i) regularPrice_asc
  // ii) regularPrice_desc
  // iii) createdAt_desc
  // iv) createdAt_asc
  let sort = {};
  if (req.query.sort) {
    const sortQuery = req.query.sort.split("_");
    // Backwards compat: UI may request regularPrice sorting.
    if (sortQuery[0] === "regularPrice") sortQuery[0] = "monthlyRent";
    if (sortQuery[1] === "desc") {
      sort[sortQuery[0]] = -1;
    } else {
      sort[sortQuery[0]] = 1;
    }
  } else {
    sort = { createdAt: 1 };
  }

  // 3) Base filter: only active listings for public browsing
  const filter = { status: "active" };

  // 3a) Text search (name/description)
  const searchTerm = (req.query.searchTerm || "").toString().trim();
  if (searchTerm) {
    const regex = new RegExp(searchTerm, "i");
    filter.$or = [{ name: regex }, { description: regex }];
  }

  // 3b) Location/area search
  const location = (req.query.location || "").toString().trim();
  if (location) {
    filter.location = new RegExp(location, "i");
  }

  // 3c) Price range (monthlyRent)
  const minRent = Number(req.query.minRent || 0);
  const maxRent = Number(req.query.maxRent || 0);
  if (minRent || maxRent) {
    filter.monthlyRent = {};
    if (minRent) filter.monthlyRent.$gte = minRent;
    if (maxRent) filter.monthlyRent.$lte = maxRent;
  }

  // 3d) Minimum bedrooms
  const minBedrooms = Number(req.query.minBedrooms || 0);
  if (minBedrooms) {
    filter.bedrooms = { $gte: minBedrooms };
  }

  // 3e) Amenities (solar, borehole, security, parking, internet)
  const amenityKeys = ["solar", "borehole", "security", "parking", "internet"];
  for (const key of amenityKeys) {
    if (req.query[key] === "true") {
      filter[`amenities.${key}`] = true;
    }
  }

  // 4) Find all listings based on type "all" or "sale" or "rent"
  if (req.query.type && req.query.type !== "all") {
    filter.type = req.query.type;
  }

  // 5) Find all listings based on parking true or false
  if (req.query.parking) {
    if (req.query.parking === "false") {
      filter.parking = { $in: [true, false] };
    } else {
      filter.parking = req.query.parking;
    }
  }

  // 6) Find all listings based on furnished true or false
  if (req.query.furnished) {
    if (req.query.furnished === "false") {
      filter.furnished = { $in: [true, false] };
    } else {
      filter.furnished = req.query.furnished;
    }
  }

  // 7) Find all listings based on offer true or false
  if (req.query.offer) {
    if (req.query.offer === "false") {
      filter.offer = { $in: [true, false] };
    } else {
      filter.offer = req.query.offer;
    }
  }

  // 4) Find all listings
  const listings = await Listing.find(filter)
    .skip(skip)
    .limit(limit)
    .sort(sort);

  // 5) Send the response
  res.status(200).json({
    status: "success",
    results: listings.length,
    data: listings,
  });
});
