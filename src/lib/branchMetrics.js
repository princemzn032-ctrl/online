const typicalSubjectCounts = {
  CSE: 48,
  IT: 46,
  ECE: 45,
  EE: 44,
  ME: 43,
  CE: 42,
};

export function getTypicalSubjectCount(branch) {
  return typicalSubjectCounts[branch.code]
    || (branch.semesters || []).reduce((total, semester) => total + semester.subjectCount, 0);
}
