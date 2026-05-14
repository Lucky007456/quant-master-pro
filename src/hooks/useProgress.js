import { useState, useEffect, useCallback } from 'react';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { saveToStorage, getFromStorage } from '../utils/storage';

const INITIAL_STORE = {
  user: { xp: 0, level: 1, title: 'Novice', streak: { current: 0, longest: 0, lastActiveDate: null } },
  progress: {},
  badges: {},
  history: [],
  activity: [],
  dailyChallenge: { date: '', completed: false, questionIds: [] }
};

export function useProgress(authUser) {
  const [store, setStore] = useState(() => getFromStorage('quantmaster_v2') || INITIAL_STORE);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync from Firebase on Login
  useEffect(() => {
    if (!authUser) return;

    const docRef = doc(db, 'users', authUser.uid);
    
    // Initial fetch
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStore(data);
        saveToStorage('quantmaster_v2', data);
      } else {
        // First time user, save current local store to firebase
        setDoc(docRef, store);
      }
    });

    // Listen for remote changes (multi-device sync)
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists() && !isSyncing) {
        const data = snap.data();
        setStore(data);
        saveToStorage('quantmaster_v2', data);
      }
    });

    return unsub;
  }, [authUser]);

  // Sync to Firebase on local change
  useEffect(() => {
    if (!authUser) {
      saveToStorage('quantmaster_v2', store);
      return;
    }

    const syncToFirebase = async () => {
      setIsSyncing(true);
      try {
        await setDoc(doc(db, 'users', authUser.uid), store);
      } catch (err) {
        console.error('Firebase Sync Error:', err);
      }
      setIsSyncing(false);
    };

    const timer = setTimeout(syncToFirebase, 2000); // Debounce sync
    return () => clearTimeout(timer);
  }, [store, authUser]);

  const recordAnswer = useCallback((qId, topic, correct, time) => {
    setStore(prev => {
      const next = { ...prev };
      if (!next.progress[topic]) next.progress[topic] = { attempted: 0, correct: 0, history: [] };
      
      next.progress[topic].attempted++;
      if (correct) next.progress[topic].correct++;
      next.progress[topic].history = [{ qId, correct, time, date: new Date().toISOString() }, ...(next.progress[topic].history || []).slice(0, 49)];
      
      return next;
    });
  }, []);

  const getTopicStats = useCallback((topic) => {
    const s = store.progress[topic];
    if (!s) return { attempted: 0, correct: 0, accuracy: 0 };
    return { ...s, accuracy: Math.round((s.correct / s.attempted) * 100) };
  }, [store.progress]);

  const getTotalStats = useCallback(() => {
    let attempted = 0, correct = 0;
    Object.values(store.progress).forEach(s => {
      attempted += s.attempted;
      correct += s.correct;
    });
    return { attempted, correct, accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0 };
  }, [store.progress]);

  return { store, setStore, recordAnswer, getTopicStats, getTotalStats };
}
