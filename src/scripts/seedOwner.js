require('dotenv').config();
const mongoose = require('mongoose');
const Owner = require('../models/Owner');
const connectDB = require('../config/database');

const seedOwner = async () => {
  await connectDB();

  const email = process.env.SEED_OWNER_EMAIL || 'owner@clinic.com';
  const password = process.env.SEED_OWNER_PASSWORD;

  if (!password) {
    console.error('❌ SEED_OWNER_PASSWORD is not set in .env');
    process.exit(1);
  }

  const existing = await Owner.findOne({ email });
  if (existing) {
    console.log('⚠️  Owner already exists:', email);
    process.exit(0);
  }

  const owner = await Owner.create({
    name: 'Super Owner',
    email,
    passwordHash: password,
    isActive: true,
    emailVerified: true,
  });

  console.log('✅ Owner created successfully');
  console.log('📧 Email   :', owner.email);
  console.log('🔑 Password:', password);

  process.exit(0);
};

seedOwner().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
