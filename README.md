# Youstel Student Registration Form

Standalone React application for Youstel hostel student registration.

## Features

- Complete student registration form
- Room selection with pricing packages
- Fee breakdown calculation
- Profile photo upload
- Print registration details
- Bank account information display with QR code
- Responsive design

## Installation

```bash
npm install
```

## Development

```bash
npm start
```

Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

## Environment Variables

Create a `.env` file based on `.env.example`:

```
REACT_APP_API_BASE_URL=https://hostel-management-backend-new-1.onrender.com/api
```

## Deployment

### Netlify

The app is configured for Netlify deployment with `netlify.toml`. Simply connect your GitHub repository to Netlify and it will automatically build and deploy.

## Project Structure

```
src/
├── index.js              # React entry point
├── App.js                # Main app component
├── index.css             # Global styles
├── StudentRegistration.js # Registration form component
├── Auth.css              # Form styling
└── services/
    └── api.js            # API service calls
public/
├── index.html            # HTML template
└── youstel-qr.png        # QR code image
```

## License

MIT
