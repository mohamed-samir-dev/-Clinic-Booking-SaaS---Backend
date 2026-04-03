require('dotenv').config();
const connectDB = require('../config/database');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');

const doctors = [
  {
    firstName: 'Ahmed',
    lastName: 'Hassan',
    name: { en: 'Dr. Ahmed Hassan', ar: 'د. أحمد حسن' },
    specialty: { en: 'Cardiology', ar: 'أمراض القلب' },
    email: 'ahmed.hassan@clinic.com',
    photoUrl: 'https://i.ibb.co/fV14s2NH/doctors-day-handsome-brunette-cute-guy-medical-gown-with-crossed-hands.avif',
    experienceYears: 12,
    fees: 300,
    followUpFees: 150,
    gender: 'male',
    title: 'Dr',
    languages: ['Arabic', 'English'],
    bio: { en: 'Specialist in cardiovascular diseases with 12 years of experience.', ar: 'متخصص في أمراض القلب والأوعية الدموية بخبرة 12 عاماً.' },
    availability: [
      { day: 'sunday',    slots: [{ from: '09:00', to: '13:00' }] },
      { day: 'tuesday',   slots: [{ from: '09:00', to: '13:00' }] },
      { day: 'thursday',  slots: [{ from: '09:00', to: '13:00' }] },
    ],
  },
  {
    firstName: 'Mohamed',
    lastName: 'Ali',
    name: { en: 'Dr. Mohamed Ali', ar: 'د. محمد علي' },
    specialty: { en: 'Dermatology', ar: 'الأمراض الجلدية' },
    email: 'mohamed.ali@clinic.com',
    photoUrl: 'https://i.ibb.co/jPszcgdX/male.avif',
    experienceYears: 8,
    fees: 250,
    followUpFees: 120,
    gender: 'male',
    title: 'Dr',
    languages: ['Arabic', 'English'],
    bio: { en: 'Expert in skin diseases and cosmetic dermatology.', ar: 'خبير في الأمراض الجلدية والتجميل.' },
    availability: [
      { day: 'monday',    slots: [{ from: '10:00', to: '14:00' }] },
      { day: 'wednesday', slots: [{ from: '10:00', to: '14:00' }] },
      { day: 'saturday',  slots: [{ from: '10:00', to: '14:00' }] },
    ],
  },
  {
    firstName: 'Khaled',
    lastName: 'Ibrahim',
    name: { en: 'Dr. Khaled Ibrahim', ar: 'د. خالد إبراهيم' },
    specialty: { en: 'Orthopedics', ar: 'جراحة العظام' },
    email: 'khaled.ibrahim@clinic.com',
    photoUrl: 'https://i.ibb.co/MxKBnbns/male-doctor2.avif',
    experienceYears: 15,
    fees: 350,
    followUpFees: 180,
    gender: 'male',
    title: 'Prof',
    languages: ['Arabic', 'English', 'French'],
    bio: { en: 'Professor in orthopedic surgery with 15 years of experience.', ar: 'أستاذ في جراحة العظام بخبرة 15 عاماً.' },
    availability: [
      { day: 'sunday',    slots: [{ from: '08:00', to: '12:00' }] },
      { day: 'monday',    slots: [{ from: '08:00', to: '12:00' }] },
      { day: 'wednesday', slots: [{ from: '08:00', to: '12:00' }] },
    ],
  },
  {
    firstName: 'Omar',
    lastName: 'Youssef',
    name: { en: 'Dr. Omar Youssef', ar: 'د. عمر يوسف' },
    specialty: { en: 'Pediatrics', ar: 'طب الأطفال' },
    email: 'omar.youssef@clinic.com',
    photoUrl: 'https://i.ibb.co/sdQJnrq4/male-doctor3.avif',
    experienceYears: 10,
    fees: 200,
    followUpFees: 100,
    gender: 'male',
    title: 'Dr',
    languages: ['Arabic', 'English'],
    bio: { en: 'Dedicated pediatrician with 10 years of experience in child healthcare.', ar: 'طبيب أطفال متخصص بخبرة 10 سنوات في رعاية صحة الأطفال.' },
    availability: [
      { day: 'sunday',    slots: [{ from: '09:00', to: '13:00' }] },
      { day: 'tuesday',   slots: [{ from: '09:00', to: '13:00' }] },
      { day: 'thursday',  slots: [{ from: '14:00', to: '18:00' }] },
    ],
  },
  {
    firstName: 'Tarek',
    lastName: 'Mahmoud',
    name: { en: 'Dr. Tarek Mahmoud', ar: 'د. طارق محمود' },
    specialty: { en: 'General Medicine', ar: 'الطب العام' },
    email: 'tarek.mahmoud@clinic.com',
    photoUrl: 'https://i.ibb.co/4RbgQtJc/male-doctor4.avif',
    experienceYears: 6,
    fees: 150,
    followUpFees: 80,
    gender: 'male',
    title: 'Dr',
    languages: ['Arabic'],
    bio: { en: 'General practitioner providing comprehensive primary care.', ar: 'طبيب عام يقدم رعاية صحية أولية شاملة.' },
    availability: [
      { day: 'monday',    slots: [{ from: '08:00', to: '16:00' }] },
      { day: 'tuesday',   slots: [{ from: '08:00', to: '16:00' }] },
      { day: 'wednesday', slots: [{ from: '08:00', to: '16:00' }] },
      { day: 'thursday',  slots: [{ from: '08:00', to: '16:00' }] },
    ],
  },
  {
    firstName: 'Yasser',
    lastName: 'Nabil',
    name: { en: 'Dr. Yasser Nabil', ar: 'د. ياسر نبيل' },
    specialty: { en: 'ENT', ar: 'أنف وأذن وحنجرة' },
    email: 'yasser.nabil@clinic.com',
    photoUrl: 'https://i.ibb.co/27rzg3zF/male-doctor1.avif',
    experienceYears: 9,
    fees: 220,
    followUpFees: 110,
    gender: 'male',
    title: 'Consultant',
    languages: ['Arabic', 'English'],
    bio: { en: 'Consultant ENT specialist with expertise in ear, nose and throat disorders.', ar: 'استشاري أنف وأذن وحنجرة متخصص في اضطرابات الأذن والأنف والحنجرة.' },
    availability: [
      { day: 'sunday',    slots: [{ from: '11:00', to: '15:00' }] },
      { day: 'wednesday', slots: [{ from: '11:00', to: '15:00' }] },
      { day: 'friday',    slots: [{ from: '10:00', to: '13:00' }] },
    ],
  },
  {
    firstName: 'Hossam',
    lastName: 'Fathy',
    name: { en: 'Dr. Hossam Fathy', ar: 'د. حسام فتحي' },
    specialty: { en: 'Dentistry', ar: 'طب الأسنان' },
    email: 'hossam.fathy@clinic.com',
    photoUrl: 'https://i.ibb.co/SwPs0NPd/male-doctor5.avif',
    experienceYears: 7,
    fees: 180,
    followUpFees: 90,
    gender: 'male',
    title: 'Dr',
    languages: ['Arabic', 'English'],
    bio: { en: 'Dental specialist with focus on cosmetic and restorative dentistry.', ar: 'متخصص في طب الأسنان التجميلي والترميمي.' },
    availability: [
      { day: 'monday',    slots: [{ from: '09:00', to: '13:00' }] },
      { day: 'tuesday',   slots: [{ from: '09:00', to: '13:00' }] },
      { day: 'thursday',  slots: [{ from: '14:00', to: '18:00' }] },
      { day: 'saturday',  slots: [{ from: '09:00', to: '13:00' }] },
    ],
  },
  {
    firstName: 'Amr',
    lastName: 'Samir',
    name: { en: 'Dr. Amr Samir', ar: 'د. عمرو سمير' },
    specialty: { en: 'Gynecology', ar: 'أمراض النساء والتوليد' },
    email: 'amr.samir@clinic.com',
    photoUrl: 'https://i.ibb.co/sdCVGNd4/male-doctor6.avif',
    experienceYears: 14,
    fees: 280,
    followUpFees: 140,
    gender: 'male',
    title: 'Prof',
    languages: ['Arabic', 'English'],
    bio: { en: 'Professor in obstetrics and gynecology with 14 years of clinical experience.', ar: 'أستاذ في أمراض النساء والتوليد بخبرة سريرية 14 عاماً.' },
    availability: [
      { day: 'sunday',    slots: [{ from: '10:00', to: '14:00' }] },
      { day: 'tuesday',   slots: [{ from: '10:00', to: '14:00' }] },
      { day: 'thursday',  slots: [{ from: '10:00', to: '14:00' }] },
    ],
  },
  {
    firstName: 'Sara',
    lastName: 'Mostafa',
    name: { en: 'Dr. Sara Mostafa', ar: 'د. سارة مصطفى' },
    specialty: { en: 'Gynecology', ar: 'أمراض النساء والتوليد' },
    email: 'sara.mostafa@clinic.com',
    photoUrl: 'https://i.ibb.co/b9N4bGW/women.avif',
    experienceYears: 11,
    fees: 270,
    followUpFees: 130,
    gender: 'female',
    title: 'Dr',
    languages: ['Arabic', 'English'],
    bio: { en: 'Specialist in women health and obstetrics with 11 years of experience.', ar: 'متخصصة في صحة المرأة والتوليد بخبرة 11 عاماً.' },
    availability: [
      { day: 'sunday',    slots: [{ from: '10:00', to: '14:00' }] },
      { day: 'tuesday',   slots: [{ from: '10:00', to: '14:00' }] },
      { day: 'thursday',  slots: [{ from: '10:00', to: '14:00' }] },
    ],
  },
  {
    firstName: 'Nour',
    lastName: 'Khaled',
    name: { en: 'Dr. Nour Khaled', ar: 'د. نور خالد' },
    specialty: { en: 'Dermatology', ar: 'الأمراض الجلدية' },
    email: 'nour.khaled@clinic.com',
    photoUrl: 'https://i.ibb.co/ynGqjVNT/female-doctor1.avif',
    experienceYears: 7,
    fees: 240,
    followUpFees: 120,
    gender: 'female',
    title: 'Dr',
    languages: ['Arabic', 'English'],
    bio: { en: 'Dermatologist specializing in skin care and cosmetic treatments.', ar: 'طبيبة جلدية متخصصة في العناية بالبشرة والعلاجات التجميلية.' },
    availability: [
      { day: 'monday',    slots: [{ from: '11:00', to: '15:00' }] },
      { day: 'wednesday', slots: [{ from: '11:00', to: '15:00' }] },
      { day: 'saturday',  slots: [{ from: '10:00', to: '13:00' }] },
    ],
  },
];

const seedDoctors = async () => {
  await connectDB();

  const clinic = await Clinic.findOne({ status: 'active' });
  if (!clinic) {
    console.error('❌ No active clinic found. Please create a clinic first.');
    process.exit(1);
  }

  console.log(`🏥 Using clinic: ${clinic.name?.en || clinic._id}`);

  let created = 0;
  let skipped = 0;

  for (const data of doctors) {
    const existing = await Doctor.findOne({ clinicId: clinic._id, email: data.email });
    if (existing) {
      console.log(`⚠️  Skipped (already exists): ${data.email}`);
      skipped++;
      continue;
    }

    await Doctor.create({
      ...data,
      clinicId: clinic._id,
      status: 'active',
      isFeatured: true,
      auth: { emailVerified: true, passwordHash: 'Doctor@123456' },
      bookingSettings: { allowOnlineBooking: true, requiresConfirmation: false },
    });

    console.log(`✅ Created: Dr. ${data.firstName} ${data.lastName} — ${data.specialty.en} | 📧 ${data.email} | 🔑 Doctor@123456`);
    created++;
  }

  console.log(`\n📊 Done! Created: ${created} | Skipped: ${skipped}`);
  process.exit(0);
};

seedDoctors().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
