import mongoose from 'mongoose';

const connectDatabase = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/continental';

    await mongoose.connect(mongoUrl);

    console.log('MongoDB Connected Successfully');
    console.log(`Database: ${mongoose.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB Connection Error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB Disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB Reconnected');
    });

  } catch (error) {
    console.error('MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

export default connectDatabase;