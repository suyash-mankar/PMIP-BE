# Contributing to PM Interview Practice Backend

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## 🚀 Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/pm-interview-practice-backend.git
   cd pm-interview-practice-backend
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Set up your environment**
   - Follow [SETUP_GUIDE.md](./SETUP_GUIDE.md)
5. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Development Workflow

### 1. Code Style

- Follow the existing code style
- Use ESLint: `npm run lint`
- Use Prettier for formatting (config in `.prettierrc`)
- Write meaningful commit messages

### 2. Testing

- Write tests for new features
- Ensure all tests pass: `npm test`
- Maintain or improve code coverage
- Test manually with cURL or Postman

### 3. Database Changes

If you modify the database schema:

```bash
# Update prisma/schema.prisma
# Then create a migration
npx prisma migrate dev --name descriptive_migration_name

# Update seed if needed
# Test migration: npm run seed
```

### 4. API Changes

When adding or modifying endpoints:

- Update OpenAPI/Swagger docs (if applicable)
- Add validation schemas in `src/utils/validation.js`
- Write integration tests
- Update README.md with new endpoints
- Add example cURL commands

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/auth.test.js
```

## 📋 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring
- `style:` - Code style changes (formatting, etc.)
- `chore:` - Maintenance tasks

**Examples:**

```
feat: add password reset endpoint
fix: resolve race condition in scoring service
docs: update README with deployment instructions
test: add integration tests for payment flow
```

## 🔍 Pull Request Process

1. **Update documentation**

   - Update README.md if API changes
   - Update SETUP_GUIDE.md if setup changes
   - Add JSDoc comments to new functions

2. **Ensure quality**

   - All tests pass
   - No linting errors
   - Code coverage doesn't decrease

3. **Create pull request**

   - Use a descriptive title
   - Reference related issues
   - Describe what changed and why
   - Include screenshots/examples if applicable

4. **Code review**
   - Address reviewer feedback
   - Keep the PR focused and small
   - Be responsive to comments

## 🐛 Reporting Bugs

When reporting bugs, include:

- Node.js and npm versions
- MySQL version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Error messages and stack traces
- Relevant logs

**Use this template:**

```markdown
**Environment:**

- Node.js: v18.19.0
- MySQL: 8.0.32
- OS: macOS 14.0

**Steps to Reproduce:**

1. ...
2. ...
3. ...

**Expected Behavior:**
...

**Actual Behavior:**
...

**Error Messages:**
```

...

```

```

## 💡 Suggesting Features

We welcome feature suggestions! Please:

- Check if the feature already exists or is planned
- Open an issue with the `enhancement` label
- Describe the use case and benefits
- Provide examples or mockups if applicable

## 🔐 Security Issues

**Do NOT** open public issues for security vulnerabilities.

Instead, email security concerns to: [your-email]

We'll work with you to:

1. Confirm the issue
2. Develop a fix
3. Release a patch
4. Credit you (if desired)

## 📚 Code Structure

```
src/
├── config/        # Configuration (DB, OpenAI, Stripe)
├── controllers/   # Request handlers
├── middlewares/   # Express middlewares
├── routes/        # Route definitions
├── services/      # Business logic
└── utils/         # Helper functions
```

**Guidelines:**

- Controllers should be thin (delegate to services)
- Services contain business logic
- Keep functions small and focused
- Use async/await (not callbacks)
- Handle errors properly

## 🎯 Areas for Contribution

Looking for ways to contribute? Check out:

- [ ] Open issues labeled `good first issue`
- [ ] Open issues labeled `help wanted`
- [ ] Improving test coverage
- [ ] Documentation improvements
- [ ] Performance optimizations
- [ ] Additional PM question categories
- [ ] Enhanced scoring criteria
- [ ] Internationalization (i18n)

## 📖 Resources

- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Jest Testing Framework](https://jestjs.io/)

## 🤝 Code of Conduct

Be respectful, inclusive, and professional:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing! 🙌**
