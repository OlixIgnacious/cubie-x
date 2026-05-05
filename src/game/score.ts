import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { GameState } from './types';

export class ScoreManager {
  public state: GameState;
  public onRestart?: () => void;

  constructor() {
    this.state = this.getInitialState();
  }

  getInitialState(): GameState {
    return {
      distance: 0,
      score: 0,
      multiplier: 1.0,
      streak: 0,
      cleanRun: true,
      zone: 0,
      isGameOver: false,
      isPaused: false,
      lastCheckpoint: { distance: 0, score: 0, zone: 0 }
    };
  }

  addDistance(delta: number) {
    if (this.state.isGameOver || this.state.isPaused) return;
    this.state.distance += delta;
    this.state.score += delta * this.state.multiplier;
  }

  collect(isSecret: boolean) {
    const points = isSecret ? 500 : 100;
    this.state.score += points * this.state.multiplier;
    if (isSecret) this.state.multiplier += 0.1;
  }

  enemyStomp() {
    this.state.score += 200 * this.state.multiplier;
    this.state.streak++;
    this.state.multiplier += 0.05;
  }

  resetMultiplier() {
    this.state.multiplier = 1.0;
    this.state.streak = 0;
    this.state.cleanRun = false;
  }

  checkpoint() {
    this.state.lastCheckpoint = {
      distance: this.state.distance,
      score: this.state.score,
      zone: this.state.zone
    };
    this.saveToFirebase('checkpoint');
  }

  async saveToFirebase(reason: 'gameOver' | 'checkpoint') {
    if (!auth.currentUser) return;

    const path = 'scores';
    try {
      let username = 'CubieRunner';
      // Try to get real username from profile if not anonymous
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        username = userDoc.data().username;
      } else if (auth.currentUser.displayName) {
        username = auth.currentUser.displayName;
      }

      await addDoc(collection(db, path), {
        userId: auth.currentUser.uid,
        username,
        distance: Math.floor(this.state.distance),
        totalScore: Math.floor(this.state.score),
        timestamp: serverTimestamp(),
        reason
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async getLeaderboard() {
    const path = 'scores';
    try {
      const q = query(
        collection(db, path),
        orderBy('totalScore', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }
}
