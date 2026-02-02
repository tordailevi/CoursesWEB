export type Question = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
};

export type Course = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
};

// Initial demo data – in a real app this would come from a database.
export const initialCourses: Course[] = [
  {
    id: "course-html-basics",
    title: "HTML Basics",
    description: "Learn the building blocks of web pages.",
    questions: [
      {
        id: "q1",
        text: "What does HTML stand for?",
        options: [
          "Hyper Text Markup Language",
          "Home Tool Markup Language",
          "Hyperlinks and Text Markup Language",
          "High Text Markup Language",
        ],
        correctAnswer: "Hyper Text Markup Language",
      },
      {
        id: "q2",
        text: "Which tag is used for the largest heading?",
        options: ["<heading>", "<h6>", "<h1>", "<head>"],
        correctAnswer: "<h1>",
      },
    ],
  },
  {
    id: "course-js-basics",
    title: "JavaScript Basics",
    description: "Start programming in JavaScript.",
    questions: [
      {
        id: "q1",
        text: "Which keyword is used to declare a variable in modern JavaScript?",
        options: ["var", "let", "const", "Both let and const"],
        correctAnswer: "Both let and const",
      },
      {
        id: "q2",
        text: "How do you write a comment in JavaScript?",
        options: [
          "// This is a comment",
          "<!-- This is a comment -->",
          "# This is a comment",
          "/* This is a comment */",
        ],
        correctAnswer: "// This is a comment",
      },
    ],
  },
];

