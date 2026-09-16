export const categoriesSeed = [
  { name: 'General Knowledge', description: 'Broad trivia and current events', icon: '🌍', questionCount: 50 },
  { name: 'Computer Science', description: 'Core digital and programming concepts', icon: '💻', questionCount: 60 },
  { name: 'Programming', description: 'Development logic and coding skills', icon: '🧠', questionCount: 45 },
  { name: 'Mathematics', description: 'Reasoning, arithmetic, algebra', icon: '📐', questionCount: 55 },
  { name: 'Science', description: 'Physics, chemistry, and biology', icon: '🔬', questionCount: 40 },
  { name: 'English', description: 'Grammar, vocabulary, and comprehension', icon: '📚', questionCount: 52 },
  { name: 'History', description: 'World history and key events', icon: '🏛️', questionCount: 48 },
  { name: 'Geography', description: 'Places, nations, and global knowledge', icon: '🌎', questionCount: 35 },
  { name: 'Aptitude', description: 'Analytical and reasoning challenges', icon: '⚡', questionCount: 58 },
];

export const sampleQuizSeed = [
  {
    title: 'Computer Science Fundamentals',
    description: 'Test your understanding of core programming and CS concepts.',
    category: 'Computer Science',
    difficulty: 'Medium',
    timeLimit: 12,
    totalMarks: 20,
    passingPercentage: 70,
    questions: [
      {
        question: 'Which programming language is primarily used for web development?',
        options: ['JavaScript', 'Python', 'C++', 'Java'],
        correctAnswer: 'JavaScript',
        explanation: 'JavaScript is the core language used to build interactive behavior in web applications.',
        difficulty: 'Medium',
        marks: 1,
      },
      {
        question: 'What does HTML stand for?',
        options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlink Technical Model Language', 'Home Tool Markup Language'],
        correctAnswer: 'HyperText Markup Language',
        explanation: 'HTML is the standard markup language used to structure content on the web.',
        difficulty: 'Easy',
        marks: 1,
      },
      {
        question: 'Which data structure uses FIFO ordering?',
        options: ['Stack', 'Queue', 'Tree', 'Graph'],
        correctAnswer: 'Queue',
        explanation: 'A queue processes elements in the order they were inserted, which is FIFO.',
        difficulty: 'Medium',
        marks: 1,
      },
      {
        question: 'What is the main purpose of an operating system?',
        options: ['To design websites', 'To manage computer hardware and software resources', 'To compile Java programs', 'To store data in the cloud'],
        correctAnswer: 'To manage computer hardware and software resources',
        explanation: 'Operating systems coordinate hardware access and provide a platform for running software.',
        difficulty: 'Medium',
        marks: 1,
      },
      {
        question: 'Which of the following is a relational database?',
        options: ['MongoDB', 'Redis', 'MySQL', 'Cassandra'],
        correctAnswer: 'MySQL',
        explanation: 'MySQL is a classic relational database management system based on tables and SQL.',
        difficulty: 'Medium',
        marks: 1,
      }
    ]
  }
];
