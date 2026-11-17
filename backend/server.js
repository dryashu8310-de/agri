
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = 3000;

const MONGO_URL =
  "mongodb://127.0.0.1:27017/smartAgriculture";

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "..", "public")));

// ==================================================
// MONGODB CONNECTION
// ==================================================

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected: smartAgriculture");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB error:", error.message);
});

// ==================================================
// COMMON AGRICULTURE RECORD SCHEMA
// ==================================================

const recordSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// ==================================================
// FARMER SCHEMA
// ==================================================

const farmerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    // Retained for compatibility with existing records
    farmerName: {
      type: String,
      required: true,
      trim: true
    },

    farmerEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    farmerPhone: {
      type: String,
      default: ""
    },

    farmerAddress: {
      type: String,
      default: ""
    },

    farmSize: {
      type: String,
      default: ""
    },

    password: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// ==================================================
// MODELS
// ==================================================

const Farmer = mongoose.model("Farmer", farmerSchema);

const Soil = mongoose.model("Soil", recordSchema);
const Fertilizer = mongoose.model("Fertilizer", recordSchema);
const Irrigation = mongoose.model("Irrigation", recordSchema);
const Crop = mongoose.model("Crop", recordSchema);
const Disease = mongoose.model("Disease", recordSchema);

// ==================================================
// TEST API
// ==================================================

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Smart Agriculture Backend Working"
  });
});

// ==================================================
// REGISTER API - USERNAME AND PASSWORD
// ==================================================

app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }

    const cleanUsername = username.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must contain at least 3 characters"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters"
      });
    }

    const existingFarmer = await Farmer.findOne({
      username: cleanUsername
    });

    if (existingFarmer) {
      return res.status(409).json({
        success: false,
        message: "Username already exists. Choose another."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Internal compatibility email.
    // The user does not need to enter an email address.
    const internalEmail =
      cleanUsername + "@local.invalid";

    const farmer = await Farmer.create({
      username: cleanUsername,
      farmerName: cleanUsername,
      farmerEmail: internalEmail,
      farmerPhone: "",
      farmerAddress: "",
      farmSize: "",
      password: hashedPassword
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",

      user: {
        userId: farmer._id.toString(),
        username: farmer.username,
        farmerName: farmer.username,
        farmerEmail: farmer.farmerEmail
      }
    });

  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message
    });
  }
});

// ==================================================
// LOGIN API
// Supports username and legacy email login
// ==================================================

app.post("/api/login", async (req, res) => {
  try {
    const {
      username,
      email,
      farmerEmail,
      password
    } = req.body;

    const loginValue = (
      username || email || farmerEmail || ""
    ).trim().toLowerCase();

    if (!loginValue || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }

    const farmer = await Farmer.findOne({
      $or: [
        { username: loginValue },
        { farmerEmail: loginValue }
      ]
    });

    if (!farmer) {
      return res.status(401).json({
        success: false,
        message: "Account not found. Please register first."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      farmer.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password"
      });
    }

    const displayUsername =
      farmer.username || farmer.farmerName;

    res.json({
      success: true,
      message: "Login successful",

      user: {
        userId: farmer._id.toString(),
        username: displayUsername,
        farmerName: displayUsername,
        farmerEmail: farmer.farmerEmail
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message
    });
  }
});

// ==================================================
// CREATE RECORD ROUTES
// ==================================================

function createRecordRoute(route, Model, label) {

  app.post(route, async (req, res) => {
    try {
      const { userId, ...data } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required"
        });
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({
          success: false,
          message: label + " data is required"
        });
      }

      const record = await Model.create({
        userId,
        data
      });

      res.status(201).json({
        success: true,
        message: label + " saved successfully",
        record
      });

    } catch (error) {
      console.error(label + " save error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to save " + label,
        error: error.message
      });
    }
  });
}

// ==================================================
// READ RECORD ROUTES
// ==================================================

function readRecordRoute(route, Model, responseName) {

  app.get(route, async (req, res) => {
    try {
      const { userId } = req.params;

      const records = await Model.find({
        userId
      }).sort({
        createdAt: -1
      });

      res.json({
        success: true,
        [responseName]: records
      });

    } catch (error) {
      console.error("Read error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to load " + responseName,
        error: error.message
      });
    }
  });
}

// ==================================================
// DELETE RECORD ROUTES
// ==================================================

function deleteRecordRoute(route, Model, label) {

  app.delete(route, async (req, res) => {
    try {
      const { recordId, userId } = req.params;

      const deletedRecord = await Model.findOneAndDelete({
        _id: recordId,
        userId
      });

      if (!deletedRecord) {
        return res.status(404).json({
          success: false,
          message: label + " record not found"
        });
      }

      res.json({
        success: true,
        message: label + " deleted successfully"
      });

    } catch (error) {
      console.error("Delete error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to delete " + label,
        error: error.message
      });
    }
  });
}

// ==================================================
// SOIL APIs
// ==================================================

createRecordRoute("/api/soil", Soil, "Soil");
readRecordRoute("/api/soil/:userId", Soil, "soil");
deleteRecordRoute(
  "/api/soil/:recordId/:userId",
  Soil,
  "Soil"
);

// ==================================================
// FERTILIZER APIs
// ==================================================

createRecordRoute(
  "/api/fertilizer",
  Fertilizer,
  "Fertilizer"
);

readRecordRoute(
  "/api/fertilizer/:userId",
  Fertilizer,
  "fertilizer"
);

deleteRecordRoute(
  "/api/fertilizer/:recordId/:userId",
  Fertilizer,
  "Fertilizer"
);

// ==================================================
// IRRIGATION APIs
// ==================================================

createRecordRoute(
  "/api/irrigation",
  Irrigation,
  "Irrigation"
);

readRecordRoute(
  "/api/irrigation/:userId",
  Irrigation,
  "irrigation"
);

deleteRecordRoute(
  "/api/irrigation/:recordId/:userId",
  Irrigation,
  "Irrigation"
);

// ==================================================
// CROP APIs
// ==================================================

createRecordRoute(
  "/api/crops",
  Crop,
  "Crop"
);

readRecordRoute(
  "/api/crops/:userId",
  Crop,
  "crops"
);

deleteRecordRoute(
  "/api/crops/:recordId/:userId",
  Crop,
  "Crop"
);

// ==================================================
// SOIL DISEASE APIs
// ==================================================

createRecordRoute(
  "/api/disease",
  Disease,
  "Disease"
);

readRecordRoute(
  "/api/disease/:userId",
  Disease,
  "disease"
);

deleteRecordRoute(
  "/api/disease/:recordId/:userId",
  Disease,
  "Disease"
);

// ==================================================
// API NOT FOUND
// ==================================================

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    requestedURL: req.originalUrl
  });
});

// ==================================================
// GENERAL ERROR HANDLER
// ==================================================

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

// ==================================================
// START SERVER AFTER MONGODB CONNECTION
// ==================================================

async function startServer() {
  try {
    await mongoose.connect(MONGO_URL);

    console.log("MongoDB connected: smartAgriculture");

    app.listen(PORT, () => {
      console.log("------------------------------------");
      console.log("SMART AGRICULTURE MANAGEMENT SYSTEM");
      console.log("Server running at http://localhost:" + PORT);
      console.log("------------------------------------");
    });

  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error("Check whether the MongoDB Windows service is running.");
  }
}

startServer();
