import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent as log } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCLAKR-zmb0Mk_mBFLIIZhSDYU8kdv-vKw",
  authDomain: "sorcerers-9534c.firebaseapp.com",
  projectId: "sorcerers-9534c",
  storageBucket: "sorcerers-9534c.appspot.com",
  messagingSenderId: "788369848487",
  appId: "1:788369848487:web:0a9ab5b455abc5adbd4382",
  measurementId: "G-GM8MJB2T40",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const logEvent = (
  eventName: string,
  eventParams?: { [key: string]: any }
) => {
  log(analytics, eventName, eventParams);
};
