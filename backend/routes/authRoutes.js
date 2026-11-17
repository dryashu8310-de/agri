const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../data/models/User");

const router = express.Router();


// ===============================
// SIGNUP
// ===============================

router.post("/register", async (req, res) => {

    try {

        const {
            name,
            email,
            phone,
            password
        } = req.body;


        // Check all fields
        if (!name || !email || !phone || !password) {

            return res.status(400).json({
                success: false,
                message: "Please fill all fields"
            });

        }


        // Password length
        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters"
            });

        }


        // Check existing email
        const existingUser =
            await User.findOne({
                email: email.toLowerCase()
            });


        if (existingUser) {

            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });

        }


        // Encrypt password
        const hashedPassword =
            await bcrypt.hash(password, 10);


        // Create new user
        const newUser = new User({

            name: name,

            email: email.toLowerCase(),

            phone: phone,

            password: hashedPassword

        });


        // Permanently save in MongoDB
        await newUser.save();


        res.status(201).json({

            success: true,

            message: "Account created successfully"

        });

    }

    catch (error) {

        console.log(
            "Signup error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Database error. Please check MongoDB."

        });

    }

});


// ===============================
// LOGIN
// ===============================

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        const user =
            await User.findOne({
                email: email.toLowerCase()
            });


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }


        const match =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!match) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }


        res.json({

            success: true,

            message: "Login successful",

            user: {

                id: user._id,

                name: user.name,

                email: user.email,

                phone: user.phone

            }

        });

    }

    catch (error) {

        console.log(
            "Login error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Database error. Please check MongoDB."

        });

    }

});


module.exports = router;