import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export function useIssueReports(book, chapter, version) {
  const [reportedVerses, setReportedVerses] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !book || !chapter || !version) {
      setReportedVerses([]);
      return;
    }

    // Make sure we have the username (displayName)
    if (!user.displayName) return;

    const q = query(
      collection(db, 'issueReports', user.displayName, 'reports'),
      where('book', '==', book),
      where('chapter', '==', chapter),
      where('version', '==', version),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const verses = [];
      snapshot.forEach((doc) => {
        verses.push(doc.data().verse);
      });
      setReportedVerses(verses);
    }, (error) => {
      console.error('Error fetching issue reports:', error);
    });

    return unsubscribe;
  }, [book, chapter, version]);

  const addReport = async (verse, issueType, description) => {
    if (!user) throw new Error("Must be logged in to report.");
    if (!user.displayName) throw new Error("Your account is missing a User ID. Please log out and log back in to fix it.");
    
    await addDoc(collection(db, 'issueReports', user.displayName, 'reports'), {
      book,
      chapter,
      verse,
      version,
      issueType,
      description,
      reportedBy: user.displayName, // user_id
      reportedAt: serverTimestamp(),
      source: 'browser',
      status: 'pending'
    });
  };

  return { reportedVerses, addReport };
}
