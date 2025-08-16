// src/App.jsx
import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase';
import { collection, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import './App.css';

// This is the component for a single band card (moved outside for clarity)
const BandCard = ({ band, onVote, user, voted, totalVotes, rank }) => {
  const percentage = totalVotes > 0 ? ((band.votes / totalVotes) * 100).toFixed(1) : 0;
  return (
    <div className="band-card">
      <img src={band.imageUrl} alt={band.name} className="band-image" />
      <div className="band-details">
        <h2>{rank}. {band.name}</h2>
        <div className="vote-info">
          <p className="percentage">{percentage}%</p>
          <button onClick={() => onVote(band.id)} disabled={!user || voted}>
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
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setVoted(false);
    });

    const unsubscribe = onSnapshot(collection(db, 'Bands'), (snapshot) => {
      const bandsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedBands = bandsData.sort((a, b) => b.votes - a.votes);
      setBands(sortedBands);
    });
    return () => unsubscribe();
  }, []);

  const handleVote = async (bandId) => {
    if (!user) return alert("Please sign in to vote!");
    if (voted) return alert("You have already voted in this session!");
    const bandRef = doc(db, 'Bands', bandId);
    await updateDoc(bandRef, { votes: increment(1) });
    setVoted(true);
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

      {/* This is the new pyramid layout structure */}
      <main className="pyramid-layout">
        <div className="pyramid-row">
          {bands.slice(0, 1).map((band, index) => (
            <BandCard key={band.id} band={band} onVote={handleVote} user={user} voted={voted} totalVotes={totalVotes} rank={index + 1} />
          ))}
        </div>
        <div className="pyramid-row">
          {bands.slice(1, 3).map((band, index) => (
            <BandCard key={band.id} band={band} onVote={handleVote} user={user} voted={voted} totalVotes={totalVotes} rank={index + 2} />
          ))}
        </div>
        <div className="pyramid-row">
          {bands.slice(3, 10).map((band, index) => (
            <BandCard key={band.id} band={band} onVote={handleVote} user={user} voted={voted} totalVotes={totalVotes} rank={index + 4} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;