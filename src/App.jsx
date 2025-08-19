// src/App.jsx
import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase';
import { collection, onSnapshot, doc, updateDoc, increment, addDoc, query, where, getDocs } from 'firebase/firestore';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import './App.css';

const BandCard = ({ band, onVote, user, voted, totalVotes, rank }) => {
  const percentage = totalVotes > 0 ? ((band.votes / totalVotes) * 100).toFixed(1) : 0;
  return (
    <div className="band-card">
      <img src={band.imageUrl} alt={band.name} className="band-image" />
      <div className="band-details">
        <h2>{rank}. {band.name}</h2>
        <div className="vote-info">
          <p className="percentage">{percentage}%</p>
          <button onClick={() => onVote(band)} disabled={voted}>
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
        <div className="logo-container">
          <img src="/logo.png" alt="K-Voter Logo" className="logo-image" />
          <h1>K-Voter</h1>
        </div>
        {user ? (
          <div className="user-info">
            <span>Welcome, {user.displayName}!</span>
            <button onClick={logOut}>Sign Out</button>
          </div>
        ) : (
          <button onClick={signIn}>Sign In with Google</button>
        )}
      </header>

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
          {/* THE FIX IS HERE: .slice(3) instead of .slice(3, 10) */}
          {bands.slice(3).map((band, index) => (
            <BandCard key={band.id} band={band} onVote={handleVote} user={user} voted={voted} totalVotes={totalVotes} rank={index + 4} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;