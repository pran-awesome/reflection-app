import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';

let authReadyPromise = null;

export function ensureAnonymousAuth() {
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            unsubscribe();
            resolve(user);
          } else {
            signInAnonymously(auth).catch((err) => {
              unsubscribe();
              reject(err);
            });
          }
        },
        (err) => {
          unsubscribe();
          reject(err);
        }
      );
    });
  }
  return authReadyPromise;
}
