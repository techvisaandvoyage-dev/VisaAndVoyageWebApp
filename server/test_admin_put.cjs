const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const testPut = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Settings = require('./models/Settings');
    const { loadSettingsDocument } = require('./utils/settingsDocument');

    const settings = await loadSettingsDocument();
    
    // Simulate updating popular countries to a smaller list (e.g. ["USA", "UK"])
    settings.popularCountries = ["USA", "UK"];
    await settings.save();

    console.log('Saved ["USA", "UK"] successfully!');
    
    // Re-load to verify
    const reload = await Settings.findOne({ singleton: 'global' });
    console.log('Reloaded popularCountries:', reload.popularCountries);

    // Reset back to standard defaults for user
    reload.popularCountries = ["USA", "UK", "EU Schengen", "Dubai", "Japan"];
    await reload.save();
    console.log('Reset to standard defaults successful!');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

testPut();
