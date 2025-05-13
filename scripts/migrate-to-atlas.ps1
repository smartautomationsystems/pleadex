# MongoDB Migration Script
# This script exports your local MongoDB data and provides instructions for importing to Atlas

# Create a directory for the backup
$backupDir = "mongodb-backup"
New-Item -ItemType Directory -Force -Path $backupDir

# Export the pleadex database
Write-Host "Exporting pleadex database..."
mongodump --db pleadex --out $backupDir

# Create a compressed archive
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "pleadex-backup-$timestamp.zip"
Compress-Archive -Path $backupDir -DestinationPath $archiveName -Force

Write-Host "`nBackup completed! The backup is saved as: $archiveName"
Write-Host "`nNext steps:"
Write-Host "1. Go to MongoDB Atlas (https://cloud.mongodb.com)"
Write-Host "2. Create a new cluster if you haven't already"
Write-Host "3. Get your Atlas connection string"
Write-Host "4. Use mongorestore to import the data:"
Write-Host "   mongorestore --uri='your_atlas_connection_string' --archive=$archiveName"
Write-Host "`nAfter importing, update your MONGODB_URI in Railway with the new Atlas connection string" 