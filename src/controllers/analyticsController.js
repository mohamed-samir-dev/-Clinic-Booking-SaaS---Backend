exports.getDoctorAnalytics = async (req, res) => {
  try {
    res.json({ success: true, message: 'Analytics endpoint' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};
