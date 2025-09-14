import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter as Router } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Router>
        <div className="app">
          {/* Routes will be added here */}
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
