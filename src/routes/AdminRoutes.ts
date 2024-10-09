import { SignupSchemaZod, LoginSchemaZod } from "./../schemas/AdminSchema";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import AdminSchema from "../models/AdminModel";
import { ReschedulingRequest } from "../models/RequestRescheduleModel";

const router = express.Router();

// Signup route
router.post("/signup", async (req: Request, res: Response) => {
  try {
    // Validate the request body with Zod
    const validatedData = SignupSchemaZod.parse(req.body);

    const { name, email, password } = validatedData;

    // Check if the admin already exists
    const adminExists = await AdminSchema.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new admin
    const admin = await AdminSchema.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Admin created successfully",
      admin,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Admin Login
router.post("/login", async (req: Request, res: Response) => {
  try {
    // Validate the request body with Zod
    const validatedData = LoginSchemaZod.parse(req.body);

    const { email, password } = validatedData;

    // Find the admin by email
    const admin = await AdminSchema.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare the password
    const isPasswordCorrect = await bcrypt.compare(password, admin.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * @route GET /reschedule-requests
 * @description List all reschedule requests (for admin)
 * @access Admin
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object, returns all reschedule requests
 */

router.get("/admin/rescheduleRequests", async (req: Request, res: Response) => {
  try {
    // Fetch all rescheduling requests and populate the expert's username
    const requests = await ReschedulingRequest.find()
      .populate({
        path: "CurrentBookingId",
        select: "_Id",
        populate: {
          path: "expertId",
          model: "Expert",
          select: "username",
        },
      })
      .populate({
        path: "RequestedDateId",
        select: "date", // Populate date details if needed
      })
      .populate({
        path: "RequestedSlotId",
        select: "_Id", // Populate slot details if needed
      });
    console.log(requests);

    // Format the response to include only the required fields
    const formattedRequests = requests.map((request) => ({
      CurrentBookingId: request.CurrentBookingId, // Include the relevant fields
      RequestedDateId: request.RequestedDateId,
      RequestedSlotId: request.RequestedSlotId,
    }));

    res.status(200).json({
      message: "Rescheduling requests retrieved successfully",
      list: formattedRequests, // Return the formatted data
    });
  } catch (error) {
    console.error("Error fetching reschedule requests:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

export default router;
