// src/App.jsx
import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase';
import {
  collection, onSnapshot, doc, query, where, getDocs, runTransaction, setDoc
} from 'firebase/firestore';
import {
  signInWithPopup, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "firebase/auth";
import './App.css';

const GroupCard = ({ group, onVote, voted, totalVotes }) => {
  const percentage = totalVotes > 0 ? (group.votes / totalVotes) * 100 : 0;
  return (
    <div className="band-card">
      <img src={group.imageUrl} alt={group.name} className="band-image" />
      <div className="band-details">
        <h2>{group.name}</h2>
        <div className="vote-info-container">
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${percentage}%` }}>
              {totalVotes > 0 && `${percentage.toFixed(1)}%`}
            </div>
          </div>
          <button onClick={() => onVote(group)} disabled={voted} className="vote-button">
            Vote
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [groups, setGroups] = useState([]);
  const [user, setUser] = useState(null);
  const [voted, setVoted] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    const checkIfVoted = async () => {
      if (user) {
        const todayGMT = new Date().toISOString().slice(0, 10);
        const voteDocId = `${user.uid}_${todayGMT}`;
        const voteDocRef = doc(db, "user_votes", voteDocId);
        // A direct getDoc is more efficient here than a query
        const voteDocSnap = await getDoc(voteDocRef);
        setVoted(voteDocSnap.exists());
      } else {
        setVoted(false);
      }
    };
    checkIfVoted();
  }, [user]);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    const unsubscribe = onSnapshot(collection(db, 'Bands'), (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedGroups = groupsData.sort((a, b) => b.votes - a.votes);
      setGroups(sortedGroups);
    });
    return () => unsubscribe();
  }, []);

  const handleVote = async (group) => {
    if (voted) {
      alert("You have already voted today!");
      return;
    }

    let currentUser = auth.currentUser;
    if (!currentUser) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        currentUser = result.user;
      } catch (error) { console.log("User cancelled login."); return; }
    }
    
    const todayGMT = new Date().toISOString().slice(0, 10);
    const voteDocId = `${currentUser.uid}_${todayGMT}`;

    try {
      await runTransaction(db, async (transaction) => {
        const userVoteRef = doc(db, "user_votes", voteDocId);
        const groupRef = doc(db, "Bands", group.id);

        const userVoteSnap = await transaction.get(userVoteRef);
        if (userVoteSnap.exists()) {
          throw new Error("You have already voted today.");
        }

        const groupDoc = await transaction.get(groupRef);
        if (!groupDoc.exists()) {
          throw new Error("Group does not exist!");
        }

        const newVoteCount = groupDoc.data().votes + 1;
        transaction.update(groupRef, { votes: newVoteCount });
        transaction.set(userVoteRef, {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          displayName: currentUser.displayName,
          bandId: group.id,
          bandName: group.name,
          timestamp: new Date(),
          voteDate: todayGMT
        });
      });

      setVoted(true);
      alert(`Your vote for ${group.name} has been counted. Thank you!`);

    } catch (e) {
      console.error("Vote transaction failed: ", e);
      alert(e.message);
      if (e.message.includes("already voted")) {
        setVoted(true);
      }
    }
  };

  const logOut = () => signOut(auth);
  const signInWithGoogle = () => signInWithPopup(auth, googleProvider).catch(error => alert(error.message));
  const handleRegister = async (e) => { e.preventDefault(); try { await createUserWithEmailAndPassword(auth, email, password); } catch (error) { alert(error.message); } };
  const handleLogin = async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, email, password); } catch (error) { alert(error.message); } };
  const totalVotes = groups.reduce((sum, group) => sum + group.votes, 0);

  return (
    <div className="app-container">
      <header>
        <img src="/logo.png" alt="K-Voter Logo" className="logo-image" />
        <h1>K-Voter</h1>
        {user && (
          <div className="user-info">
            <span>Welcome, {user.displayName || user.email}!</span>
            <button onClick={logOut}>Sign Out</button>
          </div>
        )}
      </header>
      
      <div className="sponsorship-space">
        <img src="/sponsor-image.jpg" alt="Sponsorship" className="sponsor-image" />
        <p>for sponsorships contact us at</p>
        <p>info@kvoter.com</p>
      </div>

      {!user && (
        <div className="login-container">
          <div className="auth-tabs">
            <button
              className={`tab-button ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              className={`tab-button ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>

          <form className="login-form">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
            />
            {authMode === 'login' ? (
              <button type="submit" onClick={handleLogin}>Login</button>
            ) : (
              <button type="submit" onClick={handleRegister}>Register</button>
            )}
          </form>

          <div className="divider">OR</div>
          <button onClick={signInWithGoogle} className="social-button google">Sign in with Google</button>
        </div>
      )}

      <main className="pyramid-layout">
        <div className="pyramid-row">
          {groups.slice(0, 1).map((group) => (
            <GroupCard key={group.id} group={group} onVote={handleVote} voted={voted} totalVotes={totalVotes} />
          ))}
        </div>
        <div className="pyramid-row">
          {groups.slice(1, 3).map((group) => (
            <GroupCard key={group.id} group={group} onVote={handleVote} voted={voted} totalVotes={totalVotes} />
          ))}
        </div>
        <div className="pyramid-row">
          {groups.slice(3).map((group) => (
            <GroupCard key={group.id} group={group} onVote={handleVote} voted={voted} totalVotes={totalVotes} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;