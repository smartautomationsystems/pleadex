import { connectToDatabase } from '../libs/db';

async function verifyAndUpdateRoles() {
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Check and update bcolombana@gmail.com (superadmin)
    const superadmin = await usersCollection.findOne({ email: 'bcolombana@gmail.com' });
    if (superadmin) {
      if (superadmin.role !== 'superadmin') {
        await usersCollection.updateOne(
          { email: 'bcolombana@gmail.com' },
          { $set: { role: 'superadmin' } }
        );
        console.log('Updated bcolombana@gmail.com to superadmin role');
      } else {
        console.log('bcolombana@gmail.com is already a superadmin');
      }
    } else {
      console.log('bcolombana@gmail.com not found in database');
    }

    // Check and update bcolombana@protonmail.com (regular user)
    const regularUser = await usersCollection.findOne({ email: 'bcolombana@protonmail.com' });
    if (regularUser) {
      if (regularUser.role !== 'user') {
        await usersCollection.updateOne(
          { email: 'bcolombana@protonmail.com' },
          { $set: { role: 'user' } }
        );
        console.log('Updated bcolombana@protonmail.com to user role');
      } else {
        console.log('bcolombana@protonmail.com is already a regular user');
      }
    } else {
      console.log('bcolombana@protonmail.com not found in database');
    }

    // Verify final state
    const finalSuperadmin = await usersCollection.findOne({ email: 'bcolombana@gmail.com' });
    const finalRegularUser = await usersCollection.findOne({ email: 'bcolombana@protonmail.com' });

    console.log('\nFinal Role Verification:');
    console.log('bcolombana@gmail.com:', finalSuperadmin?.role || 'not found');
    console.log('bcolombana@protonmail.com:', finalRegularUser?.role || 'not found');

  } catch (error) {
    console.error('Error verifying roles:', error);
  }
}

verifyAndUpdateRoles(); 