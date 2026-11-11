export function getAssistantReply(message) {
  const normalizedMessage = message.trim().toLowerCase();

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(normalizedMessage)) {
    return 'Hi! I can help you find quizzes, create an account, understand your dashboard, and check your scores. What would you like to do?';
  }

  if (/sign.?up|register|create (an )?account/.test(normalizedMessage)) {
    return 'Choose Sign Up in the navigation, enter your name, email, and a password of at least 6 characters, then submit the form. If the server is offline, you can still create an account stored on this device.';
  }

  if (/log.?in|sign.?in|password|account/.test(normalizedMessage)) {
    return 'Open Login in the navigation and use the email and password you registered with. Accounts created while the server is offline are stored only in this browser; online accounts need the server connection.';
  }

  if (/quiz|question|test|start/.test(normalizedMessage)) {
    return 'Open Quizzes or choose a category, then select Start Quiz. Pick an answer for each question and submit to see your score and explanations.';
  }

  if (/categor/.test(normalizedMessage)) {
    return 'Open Categories to browse available subjects. You can also use the Quizzes page to see quizzes from every category.';
  }

  if (/dashboard|progress|analytics|streak/.test(normalizedMessage)) {
    return 'Sign in and open Dashboard to see your learning overview. Analytics and completed quiz results are available from the dashboard navigation.';
  }

  if (/leaderboard|ranking|rank|points|score|result/.test(normalizedMessage)) {
    return 'Your score and correct answers appear after you submit a quiz. Open Leaderboard to compare points and rankings.';
  }

  if (/help|feature|website|platform|how does/.test(normalizedMessage)) {
    return 'QuizMaster lets you practise with quizzes, review scores, track learning, and explore rankings. Ask me about signing in, quizzes, categories, your dashboard, or scores.';
  }

  return 'I can help with QuizMaster accounts, starting quizzes, categories, dashboards, scores, and rankings. Which of those would you like help with?';
}
