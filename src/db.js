// src/db.js
// This file sets up our SQLite database, creates the tables (schema),
// and seeds it with some starter data so the API has something to return
// right away without needing a real user to sign up first.

const Database = require('better-sqlite3');
const path = require('path');

const dbFileName = process.env.NODE_ENV === 'test' ? 'data.test.sqlite' : 'data.sqlite';
const dbPath = path.join(__dirname, '..', dbFileName);
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS couriers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      team TEXT,
      transportation TEXT CHECK(transportation IN ('bicycle','car','truck')) DEFAULT 'bicycle',
      vehicleNumber TEXT,
      level INTEGER DEFAULT 1,
      ratePercent INTEGER DEFAULT 15,
      avatarUrl TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      courierId INTEGER NOT NULL REFERENCES couriers(id),
      startedAt TEXT NOT NULL,
      endedAt TEXT,
      status TEXT CHECK(status IN ('active','ended')) DEFAULT 'active',
      earned REAL DEFAULT 0,
      tips REAL DEFAULT 0,
      deliveriesCompleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderNumber TEXT UNIQUE NOT NULL,
      courierId INTEGER REFERENCES couriers(id),
      shiftId INTEGER REFERENCES shifts(id),
      status TEXT CHECK(status IN ('pending','delivering','delivered','cancelled')) DEFAULT 'pending',
      pickupName TEXT,
      pickupAddress TEXT,
      customerName TEXT,
      customerPhone TEXT,
      destinationAddress TEXT,
      total REAL DEFAULT 0,
      courierEarning REAL DEFAULT 0,
      tip REAL DEFAULT 0,
      paymentMethod TEXT DEFAULT 'credit_card',
      etaMinutes INTEGER,
      distanceLeftKm REAL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL REFERENCES orders(id),
      name TEXT NOT NULL,
      price REAL NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      courierId INTEGER NOT NULL REFERENCES couriers(id),
      orderId INTEGER REFERENCES orders(id),
      type TEXT CHECK(type IN ('earning','tip','withdrawal')) NOT NULL,
      amount REAL NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL REFERENCES orders(id),
      sender TEXT CHECK(sender IN ('courier','customer')) NOT NULL,
      text TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);
}

function seed() {
  const courierCount = db.prepare('SELECT COUNT(*) AS c FROM couriers').get().c;
  if (courierCount > 0) return; // already seeded

  const insertCourier = db.prepare(`
    INSERT INTO couriers (workId, name, email, passwordHash, team, transportation, vehicleNumber, level, ratePercent)
    VALUES (@workId, @name, @email, @passwordHash, @team, @transportation, @vehicleNumber, @level, @ratePercent)
  `);
  const courierResult = insertCourier.run({
    workId: 'ID-4873697',
    name: 'Tyler Teeler',
    email: 'tyler@example.com',
    passwordHash: 'demo-hash-not-secure', // in real life: bcrypt hash
    team: 'Downtown',
    transportation: 'bicycle',
    vehicleNumber: 'RE 345 6',
    level: 3,
    ratePercent: 25
  });
  const courierId = courierResult.lastInsertRowid;

  const insertOrder = db.prepare(`
    INSERT INTO orders (orderNumber, courierId, status, pickupName, pickupAddress, customerName, customerPhone, destinationAddress, total, courierEarning, tip, paymentMethod, etaMinutes, distanceLeftKm)
    VALUES (@orderNumber, @courierId, @status, @pickupName, @pickupAddress, @customerName, @customerPhone, @destinationAddress, @total, @courierEarning, @tip, @paymentMethod, @etaMinutes, @distanceLeftKm)
  `);
  const orderResult = insertOrder.run({
    orderNumber: '#403-540',
    courierId,
    status: 'delivering',
    pickupName: 'Lazzy Pizza',
    pickupAddress: '2002 Fantasy Lane',
    customerName: 'Mrs. Jorson',
    customerPhone: '+1 555-304-1936',
    destinationAddress: '1142 Madison Ave, apt 34',
    total: 42,
    courierEarning: 42,
    tip: 8,
    paymentMethod: 'credit_card',
    etaMinutes: 7,
    distanceLeftKm: 1.6
  });
  const orderId = orderResult.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO order_items (orderId, name, price, notes) VALUES (@orderId, @name, @price, @notes)
  `);
  insertItem.run({ orderId, name: 'Ham and Cheese Pizza 11 inch', price: 12, notes: 'Proportions: cheese mix' });
  insertItem.run({ orderId, name: 'Pepperoni Pepper', price: 10, notes: null });
  insertItem.run({ orderId, name: 'Tuesday Combo', price: 30, notes: 'Proportions: Hawaiian Hamburger, Double Cheeseburger, cola 1L' });

  const insertTx = db.prepare(`
    INSERT INTO transactions (courierId, orderId, type, amount) VALUES (@courierId, @orderId, @type, @amount)
  `);
  insertTx.run({ courierId, orderId, type: 'earning', amount: 45.05 });
  insertTx.run({ courierId, orderId: null, type: 'withdrawal', amount: -670 });

  const insertMsg = db.prepare(`
    INSERT INTO messages (orderId, sender, text) VALUES (@orderId, @sender, @text)
  `);
  insertMsg.run({ orderId, sender: 'customer', text: 'Hi, cannot reach a customer. Here for 15 mins already.' });
  insertMsg.run({ orderId, sender: 'courier', text: 'Hi! Thanks for reaching out, I will give it one more try, will get back to you in a few mins.' });
}

migrate();
seed();

module.exports = db;
