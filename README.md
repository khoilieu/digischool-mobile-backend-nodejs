# EcoSchool API

A professional Node.js + Express.js application with a well-structured architecture.

## Project Structure

```
src/
├── config/         # Configuration files
├── modules/        # Feature modules
│   ├── auth/      # Authentication module
│   └── courses/   # Courses module
├── middleware/     # Custom middleware
├── routes/         # Route definitions
├── app.js         # Express app setup
└── server.js      # Server entry point
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   DB_NAME=Ecoschool-app-dev
   DB_HOST=localhost
   DB_PORT=27017

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=24h
   ```

## Database Configuration

The application uses MongoDB as its database. You can configure the database connection through environment variables:

- `DB_NAME`: Name of your database (default: Ecoschool-app-dev)
- `DB_HOST`: MongoDB host (default: localhost)
- `DB_PORT`: MongoDB port (default: 27017)

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Documentation

### Authentication Endpoints

1. Register:
```bash
curl -X POST http://localhost:3000/api/auth/register \
-H "Content-Type: application/json" \
-d '{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}'
```

2. Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
-H "Content-Type: application/json" \
-d '{
  "email": "user@example.com",
  "password": "password123"
}'
```

3. Get Current User:
```bash
curl -X GET http://localhost:3000/api/auth/me \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Error Handling

The application includes a centralized error handling mechanism that returns appropriate error responses with status codes and messages.

## Security

- Helmet.js for security headers
- CORS enabled
- Express rate limiting
- Input validation using express-validator

## Logging

- Morgan for HTTP request logging
- Winston for application logging

## License

ISC 