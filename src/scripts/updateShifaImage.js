require('dotenv').config();
const connectDB = require('../config/database');
const Clinic = require('../models/Clinic');

const run = async () => {
  await connectDB();

  const result = await Clinic.findOneAndUpdate(
    { 'name.en': 'Shifa Clinic' },
    { $set: { images: ['https://i.ibb.co/CpRZy2gq/Chat-GPT-Image-Jul-17-2026-08-30-14-PM.webp'] } },
    { new: true }
  );

  if (!result) {
    console.error('❌ Shifa Clinic not found');
    process.exit(1);
  }

  console.log('✅ Image updated successfully');
  console.log('🖼️  images:', result.images);
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
