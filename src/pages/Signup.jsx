import { SignUp } from '@clerk/clerk-react';

function Signup() {
  return (
    <div>
          <SignUp  signInUrl='/login' forceRedirectUrl={"/landingpage"} />
    </div>
  );
}

export default Signup;
