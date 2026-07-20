const mongoose = require('mongoose');

async function connectDB() {
    if (!process.env.MONGO_URI) {
        console.warn('[DB] MONGO_URI bulunamadı. Veritabanı devre dışı.');
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('[DB] MongoDB bağlantısı başarılı!');
    } catch (err) {
        console.error('[DB] MongoDB bağlantı hatası:', err.message);
        process.exit(1);
    }
}

module.exports = connectDB;
