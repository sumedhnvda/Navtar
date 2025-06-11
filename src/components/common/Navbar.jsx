import { useNavigate } from 'react-router-dom';
import './Navbar.css';
import { useUser, SignOutButton, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

function Navbar() {
  const { user } = useUser();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo" onClick={() => navigate('/')}>
          <span className="logo-text">Navatar</span>
        </div>

        <SignedIn>
          <div className="navbar-user">
            <span className="user-welcome">Welcome, Dr. {user?.firstName}</span>
          <UserButton/>
          </div>
        </SignedIn>

        <SignedOut>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
        </SignedOut>
      </div>
    </nav>
  );
}

export default Navbar;
