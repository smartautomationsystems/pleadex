const { connectToDatabase } = require('../libs/db');
const { hash } = require('bcryptjs');

async function createUser() {
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      email: 'bcolombana@protonmail.com'
    });

    if (existingUser) {
      console.log('User already exists');
      return;
    }

    // Hash password
    const hashedPassword = await hash('Go4ItNow', 10);

    // Create user
    const result = await usersCollection.insertOne({
      email: 'bcolombana@protonmail.com',
      name: 'Bernardo Colombana',
      password: hashedPassword,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('User created successfully:', result.insertedId);
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

createUser(); 