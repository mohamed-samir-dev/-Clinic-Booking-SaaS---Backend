require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Clinic = require('../models/Clinic');
const Owner = require('../models/Owner');

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || 'owner@clinic.com';

const shifaData = {
  type: 'branch',
  name: { ar: 'عيادة شفاء', en: 'Shifa Clinic' },
  brief: {
    ar: 'عيادة شفاء – رعاية صحية متكاملة بأيدٍ متخصصة',
    en: 'Shifa Clinic – Comprehensive healthcare with specialized hands',
  },
  description: {
    ar: 'عيادة شفاء وجهتك الصحية الأولى، نقدم خدمات طبية متكاملة في بيئة مريحة وآمنة بأحدث التقنيات وكوادر طبية متخصصة.',
    en: 'Shifa Clinic is your first healthcare destination, offering comprehensive medical services in a comfortable and safe environment.',
  },
  phone: '+966500000010',
  email: 'shifa@caresync.com',
  brandColor: '#0ea5e9',
  timezone: 'Asia/Riyadh',
  currency: 'SAR',
  address: {
    ar: 'شارع الملك فهد، الرياض',
    en: 'King Fahd Road, Riyadh',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    street: 'King Fahd Road',
    lat: 24.7136,
    lng: 46.6753,
  },
  location: { type: 'Point', coordinates: [46.6753, 24.7136] },
  workingHours: {
    sunday:    { isOpen: true,  openTime: '08:00', closeTime: '22:00' },
    monday:    { isOpen: true,  openTime: '08:00', closeTime: '22:00' },
    tuesday:   { isOpen: true,  openTime: '08:00', closeTime: '22:00' },
    wednesday: { isOpen: true,  openTime: '08:00', closeTime: '22:00' },
    thursday:  { isOpen: true,  openTime: '08:00', closeTime: '22:00' },
    friday:    { isOpen: false, openTime: null,    closeTime: null    },
    saturday:  { isOpen: true,  openTime: '10:00', closeTime: '20:00' },
  },
  facilities: [
    { name: { ar: 'انتظار مكيف',   en: 'Air-conditioned waiting area' }, icon: 'sofa'       },
    { name: { ar: 'موقف سيارات',   en: 'Parking'                      }, icon: 'car'        },
    { name: { ar: 'واي فاي مجاني', en: 'Free Wi-Fi'                   }, icon: 'wifi'       },
    { name: { ar: 'صيدلية داخلية', en: 'In-house pharmacy'            }, icon: 'pill'       },
    { name: { ar: 'أشعة وتحاليل',  en: 'Radiology & Lab'              }, icon: 'microscope' },
  ],
  capacity: { rooms: 10, doctors: 8, patientsPerDay: 80 },
  bookingSettings: {
    allowOnlineBooking: true,
    advanceBookingDays: 30,
    requiresConfirmation: false,
    cancellationPolicy: {
      ar: 'يمكن إلغاء الحجز قبل 24 ساعة من الموعد دون أي رسوم.',
      en: 'Appointments can be cancelled up to 24 hours in advance at no charge.',
    },
  },
  socialMedia: {
    facebook:  'https://facebook.com/shifa.clinic',
    instagram: 'https://instagram.com/shifa.clinic',
    twitter:   'https://twitter.com/shifa_clinic',
  },
  status: 'active',
  isActive: true,
};

const run = async () => {
  await connectDB();

  // 1. Get owner
  const owner = await Owner.findOne({ email: OWNER_EMAIL });
  if (!owner) {
    console.error('❌ Owner not found:', OWNER_EMAIL);
    process.exit(1);
  }
  const businessId = owner.businessId;
  console.log(`✅ Owner found: ${owner.name} (${owner._id})`);
  console.log(`✅ Business ID: ${businessId}`);

  // 2. Create or find CareSync main clinic
  let mainClinic = await Clinic.findOne({ type: 'main' });
  if (!mainClinic) {
    mainClinic = await Clinic.create({
      type: 'main',
      name: { ar: 'كير سينك', en: 'CareSync' },
      brief: {
        ar: 'منصة رعاية صحية متكاملة تجمع أفضل العيادات',
        en: 'Integrated healthcare platform bringing together the best clinics',
      },
      phone: '+966500000000',
      email: 'info@caresync.com',
      website: 'https://www.caresync.com',
      brandColor: '#0d9488',
      timezone: 'Asia/Riyadh',
      currency: 'SAR',
      address: {
        ar: 'الرياض، المملكة العربية السعودية',
        en: 'Riyadh, Saudi Arabia',
        country: 'Saudi Arabia',
        city: 'Riyadh',
      },
      settings: {
        defaultAppointmentDuration: 30,
        cancellationPolicyHours: 24,
        reschedulePolicyHours: 12,
        bookingRules: { minNoticeHours: 2, allowWalkIns: true },
      },
      financial: {
        commissionPercentage: 15,
        taxEnabled: true,
        taxPercentage: 15,
        invoicePrefix: 'CS',
      },
      businessId,
      createdBy: owner._id,
      status: 'active',
      isActive: true,
    });
    console.log(`✅ Main clinic created: ${mainClinic.name.en} (${mainClinic._id})`);
    console.log(`\n⚠️  UPDATE YOUR .env FILE:`);
    console.log(`   MAIN_CLINIC_ID="${mainClinic._id}"\n`);
  } else {
    console.log(`✅ Main clinic already exists: ${mainClinic.name.en} (${mainClinic._id})`);
  }

  // 3. Fix existing branches — link parentClinicId + businessId if missing
  const branches = await Clinic.find({ type: 'branch' });
  for (const branch of branches) {
    const needsUpdate = !branch.parentClinicId || !branch.businessId;
    if (needsUpdate) {
      await Clinic.findByIdAndUpdate(branch._id, {
        parentClinicId: mainClinic._id,
        businessId,
      });
      console.log(`🔧 Fixed branch: ${branch.name.en} (${branch._id})`);
    } else {
      console.log(`✔️  Branch already linked: ${branch.name.en}`);
    }
  }

  // 4. Create Shifa branch if not exists
  const shifaExists = await Clinic.findOne({ 'name.en': 'Shifa Clinic' });
  if (shifaExists) {
    console.log(`⚠️  Shifa Clinic already exists (${shifaExists._id}), skipping.`);
  } else {
    const shifa = await Clinic.create({
      ...shifaData,
      parentClinicId: mainClinic._id,
      businessId,
      createdBy: owner._id,
    });
    console.log(`✅ Shifa Clinic created: ${shifa._id}`);
  }

  console.log('\n🎉 Done!');
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
