process.env.NODE_ENV = 'development';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/merkato_test';
process.env.JWT_SECRET = 'test_secret';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'test-password';

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('./server');

async function test() {
  // Wait for app to connect
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Register admin
  const regAdmin = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test Admin',
      email: `test_admin_${Date.now()}@example.com`,
      password: 'Password123!',
      roles: ['admin'],
      country: 'Ethiopia'
    });
  console.log('Register admin status:', regAdmin.status);
  console.log('Register admin body:', JSON.stringify(regAdmin.body, null, 2));
  
  const adminToken = 'Bearer ' + (regAdmin.body.token || regAdmin.body.accessToken);
  
  // Create product as admin
  const created = await request(app)
    .post('/api/products')
    .set('Authorization', adminToken)
    .send({ name: 'Test Product', price: 7.5, stock: 3, category: 'Test' });
  console.log('Create product status:', created.status);
  console.log('Create product body:', JSON.stringify(created.body, null, 2));
  
  await mongoose.connection.close();
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
