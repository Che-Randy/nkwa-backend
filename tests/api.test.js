// tests/api.test.js
// Automated tests covering: validation, correct data for valid requests,
// and proper error responses for invalid ones (as required by Task 4).

const request = require('supertest');
const app = require('../src/app');

describe('Health check', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Courier profile', () => {
  it('GET /api/couriers/me returns the seeded courier', async () => {
    const res = await request(app).get('/api/couriers/me').set('x-courier-id', '1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Tyler Teeler');
    expect(res.body.workId).toBeDefined();
  });

  it('PATCH /api/couriers/me rejects an invalid transportation value', async () => {
    const res = await request(app)
      .patch('/api/couriers/me')
      .set('x-courier-id', '1')
      .send({ transportation: 'spaceship' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('PATCH /api/couriers/me updates allowed fields', async () => {
    const res = await request(app)
      .patch('/api/couriers/me')
      .set('x-courier-id', '1')
      .send({ team: 'Uptown' });
    expect(res.status).toBe(200);
    expect(res.body.team).toBe('Uptown');
  });
});

describe('Courier signup validation', () => {
  it('rejects signup missing required fields', async () => {
    const res = await request(app).post('/api/couriers/signup').send({ name: 'No Email' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(expect.arrayContaining([expect.stringContaining('email')]));
  });

  it('creates a courier with valid data', async () => {
    const res = await request(app).post('/api/couriers/signup').send({
      name: 'Jane Doe',
      email: `jane_${Date.now()}@example.com`,
      password: 'secret123',
      transportation: 'car'
    });
    expect(res.status).toBe(201);
    expect(res.body.workId).toMatch(/^ID-/);
  });
});

describe('Shifts', () => {
  it('starting a shift for a fresh courier works, then conflicts on double start', async () => {
    const signup = await request(app).post('/api/couriers/signup').send({
      name: 'Shift Tester',
      email: `shifttester_${Date.now()}@example.com`,
      password: 'secret123'
    });
    const courierId = signup.body.id;

    const start1 = await request(app).post('/api/shifts/start').set('x-courier-id', String(courierId));
    expect(start1.status).toBe(201);
    expect(start1.body.status).toBe('active');

    const start2 = await request(app).post('/api/shifts/start').set('x-courier-id', String(courierId));
    expect(start2.status).toBe(409);
  });

  it('stopping a non-existent shift returns 404', async () => {
    const res = await request(app).post('/api/shifts/999999/stop');
    expect(res.status).toBe(404);
  });
});

describe('Wallet', () => {
  it('GET /api/wallet returns a numeric balance for the seeded courier', async () => {
    const res = await request(app).get('/api/wallet').set('x-courier-id', '1');
    expect(res.status).toBe(200);
    expect(typeof res.body.balance).toBe('number');
  });

  it('rejects withdrawal above balance', async () => {
    const res = await request(app)
      .post('/api/wallet/withdraw')
      .set('x-courier-id', '1')
      .send({ amount: 999999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Insufficient/);
  });

  it('rejects a non-numeric withdrawal amount', async () => {
    const res = await request(app)
      .post('/api/wallet/withdraw')
      .set('x-courier-id', '1')
      .send({ amount: 'lots' });
    expect(res.status).toBe(400);
  });
});

describe('Orders', () => {
  it('GET /api/orders/current returns the seeded delivering order', async () => {
    const res = await request(app).get('/api/orders/current').set('x-courier-id', '1');
    expect(res.status).toBe(200);
    expect(res.body.orderNumber).toBe('#403-540');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(3);
  });

  it('GET /api/orders/:id 404s for an order that does not exist', async () => {
    const res = await request(app).get('/api/orders/999999');
    expect(res.status).toBe(404);
  });

  it('PATCH /api/orders/:id/status rejects an invalid status', async () => {
    const res = await request(app).patch('/api/orders/1/status').send({ status: 'teleported' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/orders/:id/status marks an order delivered and credits the wallet', async () => {
    const before = await request(app).get('/api/wallet').set('x-courier-id', '1');
    const res = await request(app).patch('/api/orders/1/status').send({ status: 'delivered' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('delivered');

    const after = await request(app).get('/api/wallet').set('x-courier-id', '1');
    expect(after.body.balance).toBeGreaterThan(before.body.balance);
  });
});

describe('Order messages', () => {
  it('lists seeded messages for order 1', async () => {
    const res = await request(app).get('/api/orders/1/messages');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects a message with an invalid sender', async () => {
    const res = await request(app).post('/api/orders/1/messages').send({ sender: 'robot', text: 'beep' });
    expect(res.status).toBe(400);
  });

  it('posts a valid message', async () => {
    const res = await request(app).post('/api/orders/1/messages').send({ sender: 'courier', text: 'On my way!' });
    expect(res.status).toBe(201);
    expect(res.body.text).toBe('On my way!');
  });

  it('404s when posting to a non-existent order', async () => {
    const res = await request(app).post('/api/orders/999999/messages').send({ sender: 'courier', text: 'hi' });
    expect(res.status).toBe(404);
  });
});
