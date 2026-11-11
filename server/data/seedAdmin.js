import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set a valid ADMIN_EMAIL in server/.env.');
  }
  if (!name) {
    throw new Error('Set ADMIN_NAME in server/.env.');
  }
  if (!password || password.length < 12 || password === 'use-a-strong-unique-password') {
    throw new Error('Set a unique ADMIN_PASSWORD with at least 12 characters in server/.env.');
  }

  await connectDB();
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    existingUser.role = 'admin';
    await existingUser.save();
    console.log(`Admin access enabled for ${email}; the existing password was kept.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await User.create({ name, email, password: hashedPassword, role: 'admin' });
  console.log(`Admin account created for ${email}.`);
};

seedAdmin()
  .catch((error) => {
    console.error(`Admin setup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
