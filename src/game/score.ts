import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, doc, setDoc, getDoc, where } from 'firebase/firestore';
import { GameState } from './types';
import { MIN_SAVE_INTERVAL } from './constants';

export class ScoreManager {
  public state: GameState;
  public onRestart?: () => void;
  public onGameOver?: (isGameOver: boolean) => void;
  public username: string = 'CubieRunner';
  private lastSaveTime: number = 0;

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

    const currentTime = Date.now();
    
    // Throttling: Always allow gameOver, throttle checkpoints
    if (reason === 'checkpoint' && currentTime - this.lastSaveTime < MIN_SAVE_INTERVAL) {
        return;
    }

    const path = 'scores';
    try {
      await addDoc(collection(db, path), {
        userId: auth.currentUser.uid,
        username: this.username,
        distance: Math.floor(this.state.distance),
        totalScore: Math.floor(this.state.score),
        timestamp: serverTimestamp(),
        reason
      });

      this.lastSaveTime = currentTime;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async getLeaderboard() {
    const path = 'scores';
    try {
      const q = query(
        collection(db, path),
        where('reason', '==', 'gameOver'), // Filter out checkpoints
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

  rollback() {
    if (this.state.lastCheckpoint) {
      this.state.distance = this.state.lastCheckpoint.distance;
      this.state.score = this.state.lastCheckpoint.score;
      this.state.zone = this.state.lastCheckpoint.zone;
      this.state.multiplier = 1.0;
      this.state.streak = 0;
      this.state.isGameOver = false;
    }
  }
}
