import { SignIn } from '@clerk/clerk-react';
import './Login.css';

function Login() {
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <SignIn routing="path" path="/login" redirectUrl="/" />
        </div>
      </div>
    </div>
  );
}

export default Login;
