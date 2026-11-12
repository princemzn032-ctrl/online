const roundTwo = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateQuizScore(quiz, answers) {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let earnedMarks = 0;
  let totalMarks = 0;
  const review = [];

  quiz.questions.forEach((question) => {
    const questionId = String(question._id);
    const selectedAnswer = answers[questionId] || '';
    const marks = Number(question.marks) || 0;
    const negativeMarks = quiz.negativeMarking ? (Number(question.negativeMarks) || 0) : 0;
    const isCorrect = selectedAnswer !== '' && selectedAnswer === question.correctAnswer;

    totalMarks += marks;
    if (!selectedAnswer) {
      unansweredCount += 1;
    } else if (isCorrect) {
      correctCount += 1;
      earnedMarks += marks;
    } else {
      incorrectCount += 1;
      earnedMarks -= negativeMarks;
    }

    review.push({
      questionId,
      topicId: question.topicId ? String(question.topicId) : '',
      question: question.question,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      isCorrect,
      marks: isCorrect ? marks : selectedAnswer ? -negativeMarks : 0,
    });
  });

  const percentage = totalMarks > 0
    ? Math.max(0, Math.min(100, Math.round((earnedMarks / totalMarks) * 100)))
    : 0;

  return {
    correctCount,
    incorrectCount,
    unansweredCount,
    earnedMarks: roundTwo(earnedMarks),
    totalMarks: roundTwo(totalMarks),
    percentage,
    review,
  };
}
