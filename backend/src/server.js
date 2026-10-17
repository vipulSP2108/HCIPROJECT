const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const User = require('./models/user.model');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected Successfully');

    // Seed admin user
    const adminExists = await User.findOne({ email: 'admin@gmail.com' });
    if (!adminExists) {
      await User.create({
        email: 'admin@gmail.com',
        password: 'admin@123',
        phone: '1234567890',
        type: 'admin',
        name: 'Super Admin',
      });
      console.log('Admin user seeded');
    }
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

connectDB();

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/game', require('./routes/game.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/reminders', require('./routes/reminder.routes'));
app.use('/api/appointments', require('./routes/appointment.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/patient-config', require('./routes/patientConfig.routes'));
app.use('/api/assessment',    require('./routes/assessment.routes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
