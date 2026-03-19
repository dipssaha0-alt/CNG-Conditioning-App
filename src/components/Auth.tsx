import React from 'react';
import { auth, googleProvider, signInWithPopup, signOut, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';
import { LogIn, LogOut, User } from 'lucide-react';

interface AuthProps {
  onUserChange: (user: UserProfile | null) => void;
}

export default function Auth({ onUserChange }: AuthProps) {
  const [loading, setLoading] = React.useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let userProfile: UserProfile;
      
      if (!userDoc.exists()) {
        // Default role is auditor for new users, except for the admin email
        const role: UserRole = user.email === 'dipssaha0@gmail.com' ? 'admin' : 'auditor';
        userProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          role,
          photoURL: user.photoURL || undefined
        };
        await setDoc(userDocRef, userProfile);
      } else {
        userProfile = userDoc.data() as UserProfile;
      }
      
      onUserChange(userProfile);
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onUserChange(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {auth.currentUser ? (
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      ) : (
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <LogIn size={20} />
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      )}
    </div>
  );
}
