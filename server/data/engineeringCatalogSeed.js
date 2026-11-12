const commonSemesters = {
  1: [
    'Engineering Mathematics I',
    'Engineering Physics',
    'Programming Fundamentals',
  ],
  2: [
    'Engineering Mathematics II',
    'Engineering Chemistry',
    'Basic Electrical Engineering',
    'Engineering Graphics',
  ],
};

const branchSubjects = {
  CSE: [
    ['Data Structures and Algorithms', 'Object Oriented Programming'],
    ['Database Management Systems', 'Operating Systems'],
    ['Computer Networks', 'Software Engineering'],
    ['Artificial Intelligence', 'Machine Learning'],
    ['Compiler Design', 'Cloud Computing'],
    ['Cyber Security', 'Distributed Systems'],
  ],
  IT: [
    ['Java Programming', 'Web Technology'],
    ['Database Management Systems', 'Computer Networks'],
    ['Software Engineering', 'Cloud Computing'],
    ['Cyber Security', 'Data Analytics'],
    ['Mobile Application Development', 'Distributed Systems'],
    ['Information Security', 'Internet of Things'],
  ],
  ECE: [
    ['Electronic Devices', 'Digital Electronics'],
    ['Analog Electronics', 'Signals and Systems'],
    ['Communication Systems', 'Microprocessors'],
    ['VLSI Design', 'Embedded Systems'],
    ['Digital Signal Processing', 'Wireless Communication'],
    ['Antenna Engineering', 'Optical Communication'],
  ],
  EE: [
    ['Electrical Circuits', 'Electrical Measurements'],
    ['Electrical Machines', 'Electromagnetic Fields'],
    ['Power Systems', 'Control Systems'],
    ['Power Electronics', 'Electrical Drives'],
    ['Renewable Energy Systems', 'High Voltage Engineering'],
    ['Smart Grid Technology', 'Power System Protection'],
  ],
  ME: [
    ['Engineering Mechanics', 'Strength of Materials'],
    ['Thermodynamics', 'Fluid Mechanics'],
    ['Manufacturing Technology', 'Theory of Machines'],
    ['Heat Transfer', 'Machine Design'],
    ['Mechatronics', 'Automobile Engineering'],
    ['Finite Element Methods', 'Renewable Energy Systems'],
  ],
  CE: [
    ['Engineering Mechanics', 'Surveying'],
    ['Structural Analysis', 'Fluid Mechanics'],
    ['Geotechnical Engineering', 'Transportation Engineering'],
    ['RCC Design', 'Environmental Engineering'],
    ['Foundation Engineering', 'Water Resources Engineering'],
    ['Construction Management', 'Earthquake Engineering'],
  ],
};

export const engineeringCatalogSeed = [
  {
    name: 'Computer Science Engineering',
    code: 'CSE',
    description: 'Programming, systems, data and intelligent computing.',
  },
  {
    name: 'Information Technology',
    code: 'IT',
    description: 'Software, networks, cloud services and information systems.',
  },
  {
    name: 'Electronics and Communication Engineering',
    code: 'ECE',
    description: 'Electronics, signal processing and communication systems.',
  },
  {
    name: 'Electrical Engineering',
    code: 'EE',
    description: 'Electrical circuits, machines, control and power systems.',
  },
  {
    name: 'Mechanical Engineering',
    code: 'ME',
    description: 'Mechanics, materials, manufacturing and thermal systems.',
  },
  {
    name: 'Civil Engineering',
    code: 'CE',
    description: 'Structures, construction, geotechnics and infrastructure.',
  },
].map((branch) => ({
  ...branch,
  semesters: Array.from({ length: 8 }, (_value, index) => {
    const number = index + 1;
    const subjects = number <= 2 ? commonSemesters[number] : branchSubjects[branch.code][number - 3];
    return {
      number,
      subjects: subjects.map((name) => ({
        name,
        isCommon: number <= 2,
        topics: [`${name} fundamentals`, `${name} core concepts`],
      })),
    };
  }),
}));
