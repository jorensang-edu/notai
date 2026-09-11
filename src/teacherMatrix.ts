export type TeacherPermissions = {
  [code: string]: {
    name: string;
    permissions: 'all' | 'readonly' | { subject: string; courses: string[] }[];
  }
};

export const TEACHER_MATRIX: TeacherPermissions = {
  "9B6TV": {
    name: "JORGE SANGURIMA",
    permissions: [
      { subject: "Matemáticas", courses: ["9 EGB A", "9 EGB B", "3 BACH. A"] },
      { subject: "Física", courses: ["1 BACH. A", "1 BACH. B", "2 BACH. B"] }
    ]
  },
  "8AT2V": {
    name: "NELLY ALVAREZ",
    permissions: [
      { subject: "Matemáticas", courses: ["8 EGB A", "8 EGB B", "10 EGB A", "10 EGB B", "1 BACH. A", "1 BACH. B"] }
    ]
  },
  "X29SE": {
    name: "JESSICA CORONEL",
    permissions: [
      { subject: "Lengua y Literatura", courses: ["8 EGB A", "8 EGB B", "1 BACH. A", "2 BACH. A", "2 BACH. B", "3 BACH. A"] }
    ]
  },
  "CKKJY": {
    name: "MACEO GALINDO",
    permissions: [
      { subject: "Ciencias Naturales", courses: ["8 EGB A", "8 EGB B"] },
      { subject: "Indagación", courses: ["8 EGB A", "8 EGB B"] },
      { subject: "Biología", courses: ["1 BACH. A", "1 BACH. B", "2 BACH. B", "3 BACH. A", "3 BACH. B"] }
    ]
  },
  "3DGMR": {
    name: "EDISON RUIZ",
    permissions: [
      { subject: "Ciencias Sociales", courses: ["8 EGB A", "8 EGB B", "9 EGB A", "9 EGB B", "10 EGB A", "10 EGB B", "1 BACH. A", "1 BACH. B", "3 BACH. A", "3 BACH. B"] }
    ]
  },
  "G3ZCQ": {
    name: "JONNATHAN CAMPOVERDE",
    permissions: [
      { subject: "Indagación", courses: ["9 EGB A", "9 EGB B", "10 EGB A", "10 EGB B"] },
      { subject: "Filosofía", courses: ["1 BACH. A", "1 BACH. B", "2 BACH. A", "2 BACH. B"] },
      { subject: "Patrimonio", courses: ["1 BACH. A", "1 BACH. B", "2 BACH. A", "2 BACH. B"] },
      { subject: "Ciudadanía", courses: ["2 BACH. B"] }
    ]
  },
  "Z5G9J": {
    name: "JOSE GARCIA",
    permissions: [
      { subject: "Ciencias Sociales", courses: ["1 BACH. A", "1 BACH. B", "2 BACH. B", "2 BACH. A", "3 BACH. A", "3 BACH. B"] },
      { subject: "Investigación", courses: ["3 BACH. A", "3 BACH. B"] }
    ]
  },
  "E6VPE": {
    name: "ARODY ALCIVAR",
    permissions: [
      { subject: "Matemáticas", courses: ["2 BACH. A", "2 BACH. B", "3 BACH. B"] },
      { subject: "Química", courses: ["2 BACH. B", "3 BACH. A", "3 BACH. B"] },
      { subject: "Física", courses: ["2 BACH. A"] }
    ]
  },
  "RL464": {
    name: "JENNY ORELLANA",
    permissions: [
      { subject: "Ciencias Naturales", courses: ["9 EGB A", "9 EGB B", "10 EGB A", "10 EGB B"] },
      { subject: "Química", courses: ["1 BACH. A", "1 BACH. B", "2 BACH. A"] },
      { subject: "Biología", courses: ["2 BACH. A"] }
    ]
  },
  "P8NR3": {
    name: "ALVARO CHILLOGALLO",
    permissions: [
      { subject: "Lengua y Literatura", courses: ["9 EGB A", "9 EGB B", "10 EGB A", "10 EGB B", "1 BACH. B", "3 BACH. B"] }
    ]
  },
  "RWCV9": {
    name: "JONNATHAN GUARACA",
    permissions: "readonly"
  }
};
