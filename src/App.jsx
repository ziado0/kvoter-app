// src/App.jsx
import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase';
import { collection, onSnapshot, doc, updateDoc, increment, addDoc, query, where, getDocs } from 'firebase/firestore';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import './App.css';

const BandCard = ({ band, onVote, voted, totalVotes }) => {
  const percentage = totalVotes > 0 ? (band.votes / totalVotes) * 100 : 0;
  return (
    <div className="band-card">
      <img src={band.imageUrl} alt={band.name} className="band-image" />
      <div className="band-details">
        <h2>{band.name}</h2>
        <div className="vote-info-container">
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${percentage}%` }}>
              {totalVotes > 0 && `${percentage.toFixed(1)}%`}
            </div>
          </div>
          <button onClick={() => onVote(band)} disabled={voted} className="vote-button">
            Vote
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [bands, setBands] = useState([]);
  const [user, setUser] = useState(null);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    const checkIfVoted = async () => {
      if (user) {
        const votesQuery = query(collection(db, "user_votes"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(votesQuery);
        setVoted(!querySnapshot.empty);
      } else {
        setVoted(false);
      }
    };
    checkIfVoted();
  }, [user]);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    const unsubscribe = onSnapshot(collection(db, 'Bands'), (snapshot) => {
      const bandsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedBands = bandsData.sort((a, b) => b.votes - a.votes);
      setBands(sortedBands);
    });
    return () => unsubscribe();
  }, []);

  const handleVote = async (band) => {
    if (voted) {
      alert("You have already cast your vote!");
      return;
    }
    let currentUser = auth.currentUser;
    if (!currentUser) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        currentUser = result.user;
      } catch (error) {
        console.log("User cancelled the login prompt.");
        return;
      }
    }
    const votesQuery = query(collection(db, "user_votes"), where("userId", "==", currentUser.uid));
    const querySnapshot = await getDocs(votesQuery);
    if (!querySnapshot.empty) {
        setVoted(true);
        alert("Your account has already voted in this poll.");
        return;
    }
    const bandRef = doc(db, 'Bands', band.id);
    await updateDoc(bandRef, { votes: increment(1) });
    await addDoc(collection(db, "user_votes"), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      displayName: currentUser.displayName,
      bandId: band.id,
      bandName: band.name,
      timestamp: new Date()
    });
    setVoted(true);
    alert(`Your vote for ${band.name} has been counted. Thank you!`);
  };

  const signIn = () => signInWithPopup(auth, googleProvider).catch(console.error);
  const logOut = () => signOut(auth);
  
  const totalVotes = bands.reduce((sum, band) => sum + band.votes, 0);

  return (
    <div className="app-container">
      <header>
        <img src="/logo.png" alt="K-Voter Logo" className="logo-image" />
        <h1>K-Voter</h1>
        {user ? (
          <div className="user-info">
            <span>Welcome, {user.displayName || user.email}!</span>
            <button onClick={logOut}>Sign Out</button>
          </div>
        ) : (
          <button onClick={signIn} className="login-button">
            Sign in with Google
          </button>
        )}
      </header>

      <div className="sponsorship-space">
        <p>for sponsorships contact us at</p>
        <p>info@kvoter.com</p>
      </div>

      <main className="pyramid-layout">
        <div className="pyramid-row">
          {bands.slice(0, 1).map((band) => (
            <BandCard key={band.id} band={band} onVote={handleVote} voted={voted} totalVotes={totalVotes} />
          ))}
        </div>
        <div className="pyramid-row">
          {bands.slice(1, 3).map((band) => (
            <BandCard key={band.id} band={band} onVote={handleVote} voted={voted} totalVotes={totalVotes} />
          ))}
        </div>
        <div className="pyramid-row">
          {bands.slice(3).map((band) => (
            <BandCard key={band.id} band={band} onVote={handleVote} voted={voted} totalVotes={totalVotes} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;