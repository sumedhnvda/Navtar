import { SignIn } from '@clerk/clerk-react';
import './Login.css';

function Login() {
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <SignIn 
            signUpUrl="/signup"
            forceRedirectUrl={"/landingpage"}
          />
        </div>
      </div>
    </div>
  );
}

export default Login;
