
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const PORT = 3000;

// -------------------- MIDDLEWARE --------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend from the project's public folder
app.use(express.static(path.join(__dirname, "..", "public")));

// -------------------- MONGODB CONNECTION --------------------
mongoose
  .connect("mongodb://127.0.0.1:27017/smartAgriculture")
  .then(() => console.log("MongoDB connected: smartAgriculture"))
  .catch((error) => console.error("MongoDB connection error:", error.message));

// -------------------- COMMON SCHEMA --------------------
const recordSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

// -------------------- FARMER MODEL --------------------
const farmerSchema = new mongoose.Schema(
  {
    farmerName: { type: String, required: true, trim: true },
    farmerEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    farmerPhone: { type: String, default: "" },
    farmerAddress: { type: String, default: "" },
    farmSize: { type: String, default: "" },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

const Farmer = mongoose.model("Farmer", farmerSchema);

// -------------------- AGRICULTURE MODELS --------------------
const Soil = mongoose.model("Soil", recordSchema);
const Fertilizer = mongoose.model("Fertilizer", recordSchema);
const Irrigation = mongoose.model("Irrigation", recordSchema);
const Crop = mongoose.model("Crop", recordSchema);
const Disease = mongoose.model("Disease", recordSchema);

// -------------------- TEST API --------------------
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Smart Agriculture Backend Working"
  });
});

// -------------------- REGISTER --------------------
app.post("/api/register", async (req, res) => {
  try {
    const {
      farmerName,
      farmerEmail,
      farmerPhone,
      farmerAddress,
      farmSize,
      password
    } = req.body;

    if (!farmerName || !farmerEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Farmer name, email, and password are required"
      });
    }

    const existingFarmer = await Farmer.findOne({
      farmerEmail: farmerEmail.toLowerCase()
    });

    if (existingFarmer) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const farmer = await Farmer.create({
      farmerName,
      farmerEmail,
      farmerPhone,
      farmerAddress,
      farmSize,
      password: hashedPassword
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        userId: farmer._id.toString(),
        farmerName: farmer.farmerName,
        farmerEmail: farmer.farmerEmail
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message
    });
  }
});

// -------------------- LOGIN --------------------
app.post("/api/login", async (req, res) => {
  try {
    const { farmerEmail, email, password } = req.body;
    const loginEmail = (farmerEmail || email || "").toLowerCase();

    if (!loginEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const farmer = await Farmer.findOne({ farmerEmail: loginEmail });

    if (!farmer) {
      return res.status(401).json({
        success: false,
        message: "Account not found. Please register first."
      });
    }

    const passwordMatches = await bcrypt.compare(password, farmer.password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password"
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      user: {
        userId: farmer._id.toString(),
        farmerName: farmer.farmerName,
        farmerEmail: farmer.farmerEmail
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message
    });
  }
});

// -------------------- CREATE RECORD ROUTES --------------------
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
          message: `${label} data is required`
        });
      }

      const record = await Model.create({ userId, data });

      res.status(201).json({
        success: true,
        message: `${label} saved successfully`,
        record
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to save ${label.toLowerCase()}`,
        error: error.message
      });
    }
  });
}

// -------------------- READ RECORD ROUTES --------------------
function readRecordRoute(route, Model, label) {
  app.get(route, async (req, res) => {
    try {
      const { userId } = req.params;

      const records = await Model.find({ userId }).sort({ createdAt: -1 });

      res.json({
        success: true,
        [label.toLowerCase()]: records
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to load ${label.toLowerCase()}`,
        error: error.message
      });
    }
  });
}

// -------------------- DELETE RECORD ROUTES --------------------
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
          message: `${label} record not found`
        });
      }

      res.json({
        success: true,
        message: `${label} deleted successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to delete ${label.toLowerCase()}`,
        error: error.message
      });
    }
  });
}

// -------------------- SOIL APIs --------------------
createRecordRoute("/api/soil", Soil, "Soil");
readRecordRoute("/api/soil/:userId", Soil, "soil");
deleteRecordRoute("/api/soil/:recordId/:userId", Soil, "Soil");

// -------------------- FERTILIZER APIs --------------------
createRecordRoute("/api/fertilizer", Fertilizer, "Fertilizer");
readRecordRoute("/api/fertilizer/:userId", Fertilizer, "fertilizer");
deleteRecordRoute(
  "/api/fertilizer/:recordId/:userId",
  Fertilizer,
  "Fertilizer"
);

// -------------------- IRRIGATION APIs --------------------
createRecordRoute("/api/irrigation", Irrigation, "Irrigation");
readRecordRoute("/api/irrigation/:userId", Irrigation, "irrigation");
deleteRecordRoute(
  "/api/irrigation/:recordId/:userId",
  Irrigation,
  "Irrigation"
);

// -------------------- CROP APIs --------------------
createRecordRoute("/api/crops", Crop, "Crop");
readRecordRoute("/api/crops/:userId", Crop, "crops");
deleteRecordRoute("/api/crops/:recordId/:userId", Crop, "Crop");

// -------------------- SOIL DISEASE APIs --------------------
createRecordRoute("/api/disease", Disease, "Disease");
readRecordRoute("/api/disease/:userId", Disease, "disease");
deleteRecordRoute(
  "/api/disease/:recordId/:userId",
  Disease,
  "Disease"
);

// -------------------- API NOT FOUND --------------------
// Keep this AFTER all API routes.
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    requestedURL: req.originalUrl
  });
});

// -------------------- GENERAL ERROR HANDLER --------------------
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log("------------------------------------");
  console.log("SMART AGRICULTURE MANAGEMENT SYSTEM");
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("------------------------------------");
});
