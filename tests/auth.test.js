const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock Prisma
jest.mock('../src/config/database', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));

const prisma = require('../src/config/database');
const app = require('../src/index');

describe('Auth Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 1,
        email: newUser.email,
        role: 'user',
        createdAt: new Date(),
      });

      const response = await request(app).post('/api/auth/register').send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(newUser.email);
      expect(response.body.message).toBe('User registered successfully');
    });

    it('should reject registration with existing email', async () => {
      const existingUser = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
      };

      prisma.user.findUnique.mockResolvedValue({ id: 1, email: existingUser.email });

      const response = await request(app).post('/api/auth/register').send(existingUser);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should reject registration with invalid email', async () => {
      const invalidUser = {
        email: 'not-an-email',
        password: 'SecurePass123!',
      };

      const response = await request(app).post('/api/auth/register').send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject registration with short password', async () => {
      const invalidUser = {
        email: 'test@example.com',
        password: 'short',
      };

      const response = await request(app).post('/api/auth/register').send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const hashedPassword = await bcrypt.hash(credentials.password, 10);

      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: credentials.email,
        password: hashedPassword,
        role: 'user',
      });

      const response = await request(app).post('/api/auth/login').send(credentials);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(credentials.email);
      expect(response.body.message).toBe('Login successful');

      // Verify JWT token
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'test_secret');
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe(credentials.email);
    });

    it('should reject login with non-existent user', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123!',
      };

      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app).post('/api/auth/login').send(credentials);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with incorrect password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);

      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: credentials.email,
        password: hashedPassword,
        role: 'user',
      });

      const response = await request(app).post('/api/auth/login').send(credentials);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});
