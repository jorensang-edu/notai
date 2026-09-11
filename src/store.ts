import { useState, useEffect } from 'react';
import { CourseParams, Student, Activity, Grade, ClassNote, CourseName, SubjectName } from './types';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentFormattedDate } from './utils';
import { STUDENTS_DATA } from './data';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, query } from 'firebase/firestore';
import { writeBatch } from 'firebase/firestore';

const DEFAULT_COURSE_PARAMS: CourseParams = {
  institution: 'Unidad Educativa de Formación Integral - CEDFI',
  period: '2026-2027',
  trimestre: '1º Trimestre',
  teacher: 'Lic. Docente Principal',
};

const DEFAULT_STUDENTS: Student[] = STUDENTS_DATA.map(s => ({
  ...s,
  id: s.code
})) as Student[];

export function useAppStore() {
  const [courseParams, setCourseParamsState] = useState<CourseParams>(DEFAULT_COURSE_PARAMS);
  const [students] = useState<Student[]>(DEFAULT_STUDENTS);
  const [activities, setActivitiesState] = useState<Activity[]>([]);
  const [grades, setGradesState] = useState<Grade[]>([]);
  const [classNotes, setClassNotesState] = useState<ClassNote[]>([]);
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('sirc_highContrast') === 'true';
  });

  // Listen for Auth state and set up Firestore listeners
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // Course Params
        const unsubCourse = onSnapshot(doc(db, 'courseParams', 'default'), (docSnap) => {
          if (docSnap.exists()) {
            setCourseParamsState(docSnap.data() as CourseParams);
          } else {
            // Create default if not exists
            setDoc(doc(db, 'courseParams', 'default'), DEFAULT_COURSE_PARAMS).catch(e => 
              handleFirestoreError(e, OperationType.CREATE, 'courseParams/default')
            );
          }
        }, (err) => handleFirestoreError(err, OperationType.GET, 'courseParams/default'));

        // Activities
        const unsubActivities = onSnapshot(query(collection(db, 'activities')), (snapshot) => {
          const acts: Activity[] = [];
          snapshot.forEach(doc => acts.push(doc.data() as Activity));
          setActivitiesState(acts);
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'activities'));

        // Grades
        const unsubGrades = onSnapshot(query(collection(db, 'grades')), (snapshot) => {
          const grs: Grade[] = [];
          snapshot.forEach(doc => grs.push(doc.data() as Grade));
          setGradesState(grs);
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'grades'));

        // ClassNotes
        const unsubNotes = onSnapshot(query(collection(db, 'classNotes')), (snapshot) => {
          const notes: ClassNote[] = [];
          snapshot.forEach(doc => notes.push(doc.data() as ClassNote));
          setClassNotesState(notes);
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'classNotes'));

        return () => {
          unsubCourse();
          unsubActivities();
          unsubGrades();
          unsubNotes();
        };
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    localStorage.setItem('sirc_highContrast', String(highContrast));
    if (highContrast) {
      document.documentElement.classList.add('high-contrast-mode');
    } else {
      document.documentElement.classList.remove('high-contrast-mode');
    }
  }, [highContrast]);

  const toggleHighContrast = () => setHighContrast(prev => !prev);

  const setCourseParams = async (params: CourseParams) => {
    try {
      await updateDoc(doc(db, 'courseParams', 'default'), params as any);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'courseParams/default');
    }
  };

  const addActivity = async (activity: Omit<Activity, 'id' | 'date'>) => {
    const id = uuidv4();
    const newActivity: Activity = {
      ...activity,
      id,
      date: getCurrentFormattedDate(),
      createdAt: Date.now(),
      teacherEmail: auth.currentUser?.email || undefined,
    };
    
    // Remove undefined values for Firestore
    const firestoreData = Object.fromEntries(
      Object.entries(newActivity).filter(([_, v]) => v !== undefined)
    );

    try {
      await setDoc(doc(db, 'activities', id), firestoreData);
      return newActivity;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `activities/${id}`);
      return null;
    }
  };

  const updateGrade = async (
    studentId: string,
    activityId: string,
    originalGrade: number | null,
    reinforcementGrade: number | null,
    globalizationGrade?: number | null,
    observation?: string
  ) => {
    const existingGrade = grades.find(g => g.studentId === studentId && g.activityId === activityId);
    const now = getCurrentFormattedDate();
    
    // We can use a composite ID for grades to make updates simpler
    const id = `${studentId}_${activityId}`;

    let reinforcementDate = reinforcementGrade !== null ? now : null;
    if (existingGrade && existingGrade.reinforcementGrade === reinforcementGrade && existingGrade.reinforcementDate) {
       reinforcementDate = existingGrade.reinforcementDate;
    }

    const newGrade: Grade = {
      studentId,
      activityId,
      originalGrade: originalGrade ?? null,
      reinforcementGrade: reinforcementGrade ?? null,
      globalizationGrade: globalizationGrade !== undefined ? globalizationGrade : (existingGrade?.globalizationGrade ?? null),
      observation: observation !== undefined ? observation : (existingGrade?.observation ?? ''),
      reinforcementDate,
      lastUpdated: now,
    };

    try {
      await setDoc(doc(db, 'grades', id), newGrade);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `grades/${id}`);
    }
  };

  const updateClassNote = async (course: CourseName, subject: SubjectName, text: string) => {
    const now = getCurrentFormattedDate();
    const id = `${course.replace(/\s+/g, '_')}_${subject.replace(/\s+/g, '_')}`;
    const newNote: ClassNote = { course, subject, text, lastUpdated: now };
    
    try {
      await setDoc(doc(db, 'classNotes', id), newNote);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `classNotes/${id}`);
    }
  };

  const deleteActivity = async (activityId: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'activities', activityId));
      
      const associatedGrades = grades.filter(g => g.activityId === activityId);
      for (const g of associatedGrades) {
        batch.delete(doc(db, 'grades', `${g.studentId}_${activityId}`));
      }
      
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `activities/${activityId}`);
    }
  };

  const updateActivity = async (activityId: string, updates: Partial<Activity>) => {
    // Remove undefined values for Firestore
    const firestoreUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    try {
      await updateDoc(doc(db, 'activities', activityId), firestoreUpdates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `activities/${activityId}`);
    }
  };

  return {
    courseParams,
    setCourseParams,
    students,
    activities,
    addActivity,
    deleteActivity,
    updateActivity,
    grades,
    updateGrade,
    classNotes,
    updateClassNote,
    highContrast,
    toggleHighContrast,
  };
}
