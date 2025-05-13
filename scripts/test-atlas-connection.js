const { MongoClient } = require('mongodb');

async function testConnection() {
    // Get the connection string from environment variable
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
        console.error('MONGODB_URI environment variable is not set');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        // Connect to MongoDB
        console.log('Attempting to connect to MongoDB Atlas...');
        await client.connect();
        console.log('Successfully connected to MongoDB Atlas!');

        // Test the connection by listing databases
        const databases = await client.db().admin().listDatabases();
        console.log('\nAvailable databases:');
        databases.databases.forEach(db => {
            console.log(`- ${db.name}`);
        });

        // Test accessing the pleadex database
        const pleadexDb = client.db('pleadex');
        const collections = await pleadexDb.listCollections().toArray();
        console.log('\nCollections in pleadex database:');
        collections.forEach(collection => {
            console.log(`- ${collection.name}`);
        });

    } catch (error) {
        console.error('Error connecting to MongoDB Atlas:', error.message);
        if (error.message.includes('Authentication failed')) {
            console.error('\nThis likely means the password is incorrect. Please check your MONGODB_URI.');
        }
    } finally {
        await client.close();
    }
}

testConnection(); 