import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDoc,
  Timestamp,
  getDocs,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export type QuestionType = 'MCQ' | 'Assertion-Reason' | 'Statement-Based' | 'Matching';

export interface Quiz {
  id?: string;
  title: string;
  description?: string;
  creatorId: string;
  creatorName?: string;
  createdAt: any;
  questions: {
    type?: QuestionType;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    // For Assertion-Reason
    reason?: string;
    // For Statement-Based
    statement2?: string;
    // For Matching
    matchingPairs?: { left: string; right: string }[];
  }[];
  isPublic: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timePerQuestion: number; // in seconds
  likes?: number;
  plays?: number;
  isFeatured?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
  role: 'admin' | 'user';
  isBanned: boolean;
}

export interface QuizAttempt {
  id?: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  completedAt: any;
}

export const quizService = {
  async createQuiz(quiz: Omit<Quiz, 'id' | 'createdAt'>) {
    const path = 'quizzes';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...quiz,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async saveAttempt(attempt: Omit<QuizAttempt, 'id' | 'completedAt'>) {
    const path = 'attempts';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...attempt,
        completedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateQuiz(id: string, quiz: Partial<Quiz>) {
    const path = `quizzes/${id}`;
    try {
      const docRef = doc(db, 'quizzes', id);
      await updateDoc(docRef, quiz);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteQuiz(id: string) {
    const path = `quizzes/${id}`;
    try {
      await deleteDoc(doc(db, 'quizzes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getQuiz(id: string) {
    const path = `quizzes/${id}`;
    try {
      const docSnap = await getDoc(doc(db, 'quizzes', id));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Quiz;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async incrementLikes(id: string) {
    const path = `quizzes/${id}`;
    try {
      const docRef = doc(db, 'quizzes', id);
      await updateDoc(docRef, {
        likes: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async incrementPlays(id: string) {
    const path = `quizzes/${id}`;
    try {
      const docRef = doc(db, 'quizzes', id);
      await updateDoc(docRef, {
        plays: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  subscribeToUserQuizzes(userId: string, callback: (quizzes: Quiz[]) => void) {
    const path = 'quizzes';
    const q = query(
      collection(db, path),
      where('creatorId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const quizzes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Quiz[];
      callback(quizzes);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToUserAttempts(userId: string, callback: (attempts: QuizAttempt[]) => void) {
    const path = 'attempts';
    const q = query(
      collection(db, path),
      where('userId', '==', userId),
      orderBy('completedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const attempts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QuizAttempt[];
      callback(attempts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  subscribeToPublicQuizzes(callback: (quizzes: Quiz[]) => void) {
    const path = 'quizzes';
    const q = query(
      collection(db, path),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const quizzes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Quiz[];
      callback(quizzes);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Admin Methods
  subscribeToAllQuizzes(callback: (quizzes: Quiz[]) => void) {
    const path = 'quizzes';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Quiz[];
      callback(quizzes);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  subscribeToAllUsers(callback: (users: UserProfile[]) => void) {
    const path = 'users';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ ...doc.data() })) as UserProfile[];
      callback(users);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  async updateUserStatus(uid: string, isBanned: boolean) {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), { isBanned });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async toggleFeaturedQuiz(id: string, isFeatured: boolean) {
    const path = `quizzes/${id}`;
    try {
      await updateDoc(doc(db, 'quizzes', id), { isFeatured });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
