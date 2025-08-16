import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase';
import { collection, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import './App.css';

function App() {
  const [bands, setBands] = useState([]);
  const [user, setUser] = useState(null);
  const [voted, setVoted] = useState(false); // State to prevent multiple votes

  useEffect(() => {
    // Listen for changes in user sign-in status
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setVoted(false); // Reset vote status on logout
      }
    });

    // Listen for real-time updates from the 'bands' collection in Firestore
    const unsubscribeFirestore = onSnapshot(collection(db, 'Bands'), (snapshot) => {
      const bandsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedBands = bandsData.sort((a, b) => b.votes - a.votes);
      setBands(sortedBands);
    });

    // Clean up listeners when the component unmounts
    return () => {
      unsubscribeAuth();
      unsubscribeFirestore();
    };
  }, []);

  const handleVote = async (bandId) => {
    if (!user) return alert("Please sign in to vote!");
    if (voted) return alert("You have already voted in this session!");

    const bandRef = doc(db, 'bands', bandId);
    await updateDoc(bandRef, { votes: increment(1) });
    
    setVoted(true); // Prevent user from voting again in the same session
    alert("Thank you for your vote!");
  };

  const signIn = () => signInWithPopup(auth, googleProvider).catch(console.error);
  const logOut = () => signOut(auth);

  const totalVotes = bands.reduce((sum, band) => sum + band.votes, 0);

  return (
    <div className="app-container">
      <header>
        <h1>K-Voter 🎤</h1>
        {user ? (
          <div className="user-info">
            <span>Welcome, {user.displayName}!</span>
            <button onClick={logOut}>Sign Out</button>
          </div>
        ) : (
          <button onClick={signIn}>Sign In with Google</button>
        )}
      </header>

      <main className="bands-list">
        {bands.map((band, index) => {
          const percentage = totalVotes > 0 ? ((band.votes / totalVotes) * 100).toFixed(1) : 0;
          return (
            <div key={band.id} className="band-card" style={{ order: index }}>
              <img src={band.imageUrl} alt={band.name} className="band-image" />
              <div className="band-details">
                <h2>{index + 1}. {band.name}</h2>
                <div className="vote-info">
                  <p className="percentage">{percentage}%</p>
                  <button onClick={() => handleVote(band.id)} disabled={!user || voted}>Vote</button>
                </div>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}

export default App;