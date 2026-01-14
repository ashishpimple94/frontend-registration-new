import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import StudentRegistration from './StudentRegistration';
import './Auth.css';

function App() {
  return (
    <Router>
      <div className="App">
        <StudentRegistration />
      </div>
    </Router>
  );
}

export default App;
