// Node.js script to fetch real JWT tokens for seeded test users and print .env lines
const fetch = require('node-fetch');

const users = [
  { env: 'TEST_USER_TOKEN', email: 'customer@test.com', password: 'TestPass123!' },
  { env: 'TEST_ADMIN_TOKEN', email: 'admin@test.com', password: 'TestPass123!' }
];

const login = async (email, password) => {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error(`No token returned for ${email}`);
  return `Bearer ${data.token}`;
};

(async () => {
  for (const user of users) {
    try {
      const token = await login(user.email, user.password);
      console.log(`${user.env}=${token}`);
    } catch (err) {
      console.error(err.message);
    }
  }
})();
