import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBranches, getQuizzes, getSemesters, getSubjects } from '../api';

export default function PracticePage({ onStartQuiz, mode = 'practice', searchTerm = '', category = '' }) {
  const [searchParams] = useSearchParams();
  const [branches, setBranches] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [branchId, setBranchId] = useState(searchParams.get('branchId') || '');
  const [semesterId, setSemesterId] = useState(searchParams.get('semesterId') || '');
  const [subjectId, setSubjectId] = useState(searchParams.get('subjectId') || '');
  const [difficulty, setDifficulty] = useState('');
  const [questionCount, setQuestionCount] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getBranches()
      .then((items) => { if (active) setBranches(items); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load branches.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setSemesters([]);
    setSubjects([]);
    setSemesterId((current) => (branchId ? current : ''));
    if (!branchId) return () => { active = false; };
    getSemesters(branchId)
      .then((items) => { if (active) setSemesters(items); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load semesters.'); });
    return () => { active = false; };
  }, [branchId]);

  useEffect(() => {
    let active = true;
    setSubjects([]);
    setSubjectId((current) => (semesterId ? current : ''));
    if (!semesterId) return () => { active = false; };
    getSubjects({ branchId, semesterId })
      .then((items) => { if (active) setSubjects(items); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load subjects.'); });
    return () => { active = false; };
  }, [branchId, semesterId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getQuizzes({
      branchId,
      semesterId,
      subjectId,
      difficulty,
      quizType: mode,
      search: searchTerm.trim(),
      category,
    })
      .then((items) => { if (active) setQuizzes(items); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load quizzes.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branchId, semesterId, subjectId, difficulty, mode, searchTerm, category]);

  const selectedBranch = useMemo(() => branches.find((branch) => branch.id === branchId), [branches, branchId]);
  const questionTotal = useMemo(
    () => quizzes.reduce((total, quiz) => total + quiz.questions.length, 0),
    [quizzes],
  );

  return (
    <section className={`container practice-page practice-page--${mode}`}>
      <header className="practice-hero">
        <div className="practice-hero-copy">
          <span className="practice-kicker">{selectedBranch?.name || 'QuizMaster · Engineering library'}</span>
          <h1>{mode === 'mock' ? 'Your exam, your moment.' : 'Make every answer count.'}</h1>
          <p>Pick a subject, press play, and build your confidence one question at a time.</p>
          <a className="practice-hero-cta" href="#quiz-catalog">
            Explore {mode === 'mock' ? 'mock tests' : 'quizzes'}
            <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="practice-hero-stats" aria-live="polite">
          <div>
            <strong>{loading ? '—' : quizzes.length.toLocaleString()}</strong>
            <span>available {mode === 'mock' ? 'tests' : 'quizzes'}</span>
          </div>
          <div>
            <strong>{loading ? '—' : questionTotal.toLocaleString()}</strong>
            <span>questions to explore</span>
          </div>
        </div>
      </header>

      <div className="filter-panel panel-box" aria-label="Quiz filters">
        <label>
          Branch
          <select value={branchId} onChange={(event) => {
            setBranchId(event.target.value);
            setSemesterId('');
            setSubjectId('');
          }}>
            <option value="">All branches</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label>
          Semester
          <select value={semesterId} disabled={!branchId} onChange={(event) => {
            setSemesterId(event.target.value);
            setSubjectId('');
          }}>
            <option value="">All semesters</option>
            {semesters.map((semester) => <option key={semester.id} value={semester.id}>Semester {semester.number}</option>)}
          </select>
        </label>
        <label>
          Subject
          <select value={subjectId} disabled={!semesterId} onChange={(event) => setSubjectId(event.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label>
          Difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="">All levels</option>
            {['Easy', 'Medium', 'Hard'].map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>
        <label>
          Questions per attempt
          <select value={questionCount} onChange={(event) => setQuestionCount(event.target.value)}>
            <option value="all">All quiz questions</option>
            {[10, 20].map((count) => <option key={count} value={count}>{count} questions</option>)}
          </select>
        </label>
      </div>

      <div className="practice-catalog-heading" id="quiz-catalog">
        <div>
          <span className="practice-kicker">The collection</span>
          <h2>{mode === 'mock' ? 'Mock tests' : 'Choose your next quiz'}</h2>
        </div>
        <span className="practice-result-count" aria-live="polite">
          {loading ? 'Loading…' : `${quizzes.length} ${quizzes.length === 1 ? 'title' : 'titles'}`}
        </span>
      </div>

      {error ? <div className="form-message error" role="alert">{error}</div> : null}
      {loading ? <div className="panel-box empty-state"><h3>Loading quizzes...</h3></div> : null}
      {!loading && !quizzes.length && !error ? (
        <div className="panel-box empty-state">
          <h3>No {mode === 'mock' ? 'mock tests' : 'practice quizzes'} match these filters.</h3>
          <p>Try a different selection or check back after an administrator publishes relevant questions.</p>
        </div>
      ) : null}

      {!loading && quizzes.length > 0 ? (
        <div className="quiz-list-panel">
          {quizzes.map((quiz) => (
            <article className="quiz-card" key={quiz.id}>
              <div className="quiz-card-top">
                <span className="difficulty-pill green">{quiz.difficulty}</span>
                <span className="tag">{quiz.quizType === 'mock' ? 'Mock test' : 'Practice'}</span>
              </div>
              <h2>{quiz.title}</h2>
              <p>{quiz.description}</p>
              <div className="quiz-meta-grid">
                <span>{quiz.category}</span>
                <span>{quiz.questions.length} questions</span>
                <span>{quiz.timeLimit} min</span>
                <span>{quiz.negativeMarking ? 'Negative marking' : 'No negative marking'}</span>
              </div>
              <button
                className="primary-btn small-btn"
                onClick={() => onStartQuiz(quiz, questionCount === 'all' ? undefined : Number(questionCount))}
                disabled={!quiz.questions.length}
              >
                Start {mode === 'mock' ? 'mock test' : 'practice'}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
