import { useCallback, useEffect, useState } from 'react';
import {
  addQuizQuestion,
  archiveQuiz,
  createBranch,
  createQuiz,
  createSemester,
  createSubject,
  createTopic,
  deactivateBranch,
  deactivateSubject,
  deleteQuizQuestion,
  getAdminAttempts,
  getAdminDashboard,
  getAdminQuizzes,
  getAdminUsers,
  getBranches,
  getSemesters,
  getSubjects,
  importQuestionsCsv,
  updateQuiz,
  updateQuizQuestion,
} from '../api';
import { useAuth } from '../auth/useAuth';

const emptyQuestion = {
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: '',
  explanation: '',
  difficulty: 'Medium',
  marks: 1,
  negativeMarks: 0,
};

export default function AdminPanel() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [branches, setBranches] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [users, setUsers] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [catalogBranchId, setCatalogBranchId] = useState('');
  const [catalogSemesterId, setCatalogSemesterId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [branchForm, setBranchForm] = useState({ name: '', code: '', description: '' });
  const [semesterNumber, setSemesterNumber] = useState('1');
  const [subjectName, setSubjectName] = useState('');
  const [topicName, setTopicName] = useState('');
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    difficulty: 'Medium',
    timeLimit: 30,
    quizType: 'practice',
    questionCount: '',
    negativeMarking: false,
  });
  const [questionForm, setQuestionForm] = useState(emptyQuestion);

  const refresh = useCallback(async () => {
    const [nextDashboard, nextBranches, nextQuizzes, nextUsers, nextAttempts] = await Promise.all([
      getAdminDashboard(),
      getBranches(),
      getAdminQuizzes(),
      getAdminUsers(),
      getAdminAttempts(),
    ]);
    setDashboard(nextDashboard);
    setBranches(nextBranches);
    setQuizzes(nextQuizzes);
    setUsers(nextUsers);
    setAttempts(nextAttempts);
    setSelectedQuizId((current) => current || nextQuizzes[0]?.id || '');
  }, []);

  useEffect(() => {
    let active = true;
    refresh()
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load admin data.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    setSemesters([]);
    setSubjects([]);
    setCatalogSemesterId('');
    setSelectedSubjectId('');
    if (!catalogBranchId) return () => { active = false; };
    Promise.all([getSemesters(catalogBranchId), getSubjects({ branchId: catalogBranchId })])
      .then(([nextSemesters, nextSubjects]) => {
        if (!active) return;
        setSemesters(nextSemesters);
        setSubjects(nextSubjects);
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load branch curriculum.'); });
    return () => { active = false; };
  }, [catalogBranchId]);

  const selectedQuiz = quizzes.find((quiz) => quiz.id === selectedQuizId);

  const perform = async (action, successMessage) => {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const result = await action();
      await refresh();
      setMessage(typeof successMessage === 'function' ? successMessage(result) : successMessage);
    } catch (requestError) {
      setError(requestError.message || 'The requested change could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBranch = (event) => {
    event.preventDefault();
    void perform(async () => {
      await createBranch(branchForm);
      setBranchForm({ name: '', code: '', description: '' });
    }, 'Branch created.');
  };

  const handleCreateSemester = (event) => {
    event.preventDefault();
    if (!catalogBranchId) {
      setError('Choose a branch first.');
      return;
    }
    void perform(async () => {
      await createSemester({ branchId: catalogBranchId, number: Number(semesterNumber) });
      setSemesters(await getSemesters(catalogBranchId));
    }, 'Semester created.');
  };

  const handleCreateSubject = (event) => {
    event.preventDefault();
    if (!catalogBranchId || !catalogSemesterId) {
      setError('Choose a branch and semester first.');
      return;
    }
    void perform(async () => {
      await createSubject({
        branchId: catalogBranchId,
        semesterId: catalogSemesterId,
        name: subjectName,
      });
      setSubjects(await getSubjects({ branchId: catalogBranchId }));
      setSubjectName('');
    }, 'Subject created.');
  };

  const handleCreateTopic = (event) => {
    event.preventDefault();
    if (!selectedSubjectId) {
      setError('Choose a subject first.');
      return;
    }
    void perform(() => createTopic({ subjectId: selectedSubjectId, name: topicName }), 'Topic created.');
  };

  const handleCreateQuiz = (event) => {
    event.preventDefault();
    if (!catalogBranchId || !catalogSemesterId || !selectedSubjectId) {
      setError('Choose a branch, semester and subject for this quiz.');
      return;
    }
    void perform(async () => {
      const quiz = await createQuiz({
        ...quizForm,
        category: subjects.find((subject) => subject.id === selectedSubjectId)?.name || 'Engineering',
        branchId: catalogBranchId,
        semesterId: catalogSemesterId,
        subjectId: selectedSubjectId,
        timeLimit: Number(quizForm.timeLimit),
        questionCount: quizForm.questionCount ? Number(quizForm.questionCount) : null,
        isPublished: false,
        questions: [],
      });
      setSelectedQuizId(quiz.id);
      setQuizForm({
        title: '',
        description: '',
        difficulty: 'Medium',
        timeLimit: 30,
        quizType: 'practice',
        questionCount: '',
        negativeMarking: false,
      });
    }, 'Draft quiz created. Add reviewed questions before publishing.');
  };

  const handleAddQuestion = (event) => {
    event.preventDefault();
    if (!selectedQuizId) {
      setError('Create or select a quiz first.');
      return;
    }
    const options = [questionForm.optionA, questionForm.optionB, questionForm.optionC, questionForm.optionD]
      .map((option) => option.trim());
    void perform(async () => {
      await addQuizQuestion(selectedQuizId, {
        question: questionForm.question,
        options,
        correctAnswer: questionForm.correctAnswer,
        explanation: questionForm.explanation,
        difficulty: questionForm.difficulty,
        marks: Number(questionForm.marks),
        negativeMarks: Number(questionForm.negativeMarks),
        source: 'admin-authored',
        status: 'draft',
      });
      setQuestionForm(emptyQuestion);
    }, 'Question added as a draft for review.');
  };

  const handleCsvImport = (event) => {
    event.preventDefault();
    if (!selectedQuizId || !csvFile) {
      setError('Select a quiz and CSV file to import.');
      return;
    }
    void perform(async () => {
      const csv = await csvFile.text();
      const result = await importQuestionsCsv(selectedQuizId, csv);
      setCsvFile(null);
      return result;
    }, (result) => `Imported ${result.imported} draft questions; skipped ${result.duplicates} duplicates.`);
  };

  if (user?.role !== 'admin') {
    return (
      <section className="container admin-page">
        <div className="panel-box">
          <h1>Administrator access required</h1>
          <p>Ask a platform administrator to configure your account with admin access.</p>
        </div>
      </section>
    );
  }

  if (loading) return <section className="container admin-page"><div className="panel-box">Loading administration tools...</div></section>;

  return (
    <section className="container admin-page engineering-admin-page">
      <header className="section-heading">
        <span className="eyebrow">Administration</span>
        <h1>Manage curriculum and assessments</h1>
        <p>Imported and newly authored questions start as drafts and must be reviewed before publishing.</p>
      </header>
      {error ? <div className="form-message error" role="alert">{error}</div> : null}
      {message ? <div className="form-message success" role="status">{message}</div> : null}
      {dashboard ? (
        <div className="stats-grid dashboard-stats">
          <div className="stat-card"><label>Students</label><strong>{dashboard.users}</strong></div>
          <div className="stat-card"><label>Published quizzes</label><strong>{dashboard.quizzes}</strong></div>
          <div className="stat-card"><label>Branches</label><strong>{dashboard.branches}</strong></div>
          <div className="stat-card"><label>Attempts</label><strong>{dashboard.attempts}</strong></div>
          <div className="stat-card"><label>Average score</label><strong>{dashboard.averageScore}%</strong></div>
        </div>
      ) : null}

      <div className="admin-panels">
        <section className="panel-box admin-panel">
          <h2>Engineering catalogue</h2>
          <form className="admin-form" onSubmit={handleCreateBranch}>
            <h3>Add branch</h3>
            <input placeholder="Branch name" required value={branchForm.name} onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })} />
            <input placeholder="Branch code, e.g. CSE" required value={branchForm.code} onChange={(event) => setBranchForm({ ...branchForm, code: event.target.value.toUpperCase() })} />
            <input placeholder="Description" value={branchForm.description} onChange={(event) => setBranchForm({ ...branchForm, description: event.target.value })} />
            <button className="primary-btn" type="submit" disabled={saving}>Add branch</button>
          </form>
          <div className="admin-catalog-list">
            {branches.map((branch) => (
              <div className="admin-list-row" key={branch.id}>
                <span><strong>{branch.code}</strong> {branch.name}</span>
                <button className="secondary-btn small-btn" onClick={() => void perform(() => deactivateBranch(branch.id), 'Branch deactivated.')}>Deactivate</button>
              </div>
            ))}
          </div>
          <form className="admin-form" onSubmit={handleCreateSemester}>
            <h3>Add semester</h3>
            <select value={catalogBranchId} onChange={(event) => setCatalogBranchId(event.target.value)} required>
              <option value="">Select branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <select value={semesterNumber} onChange={(event) => setSemesterNumber(event.target.value)}>
              {Array.from({ length: 8 }, (_value, index) => index + 1).map((number) => <option key={number} value={number}>Semester {number}</option>)}
            </select>
            <button className="primary-btn" type="submit" disabled={saving}>Add semester</button>
          </form>
          <form className="admin-form" onSubmit={handleCreateSubject}>
            <h3>Add subject</h3>
            <select value={catalogSemesterId} onChange={(event) => setCatalogSemesterId(event.target.value)} required>
              <option value="">Select semester</option>
              {semesters.map((semester) => <option key={semester.id} value={semester.id}>Semester {semester.number}</option>)}
            </select>
            <input placeholder="Subject name" required value={subjectName} onChange={(event) => setSubjectName(event.target.value)} />
            <button className="primary-btn" type="submit" disabled={saving}>Add subject</button>
          </form>
          <div className="admin-form">
            <h3>Subjects</h3>
            {subjects.map((subject) => (
              <div className="admin-list-row" key={subject.id}>
                <span>{subject.name} · Semester {subject.semester}</span>
                <button className="secondary-btn small-btn" onClick={() => void perform(() => deactivateSubject(subject.id), 'Subject deactivated.')}>Deactivate</button>
              </div>
            ))}
          </div>
          <form className="admin-form" onSubmit={handleCreateTopic}>
            <h3>Add topic</h3>
            <select value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)} required>
              <option value="">Select subject</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
            <input placeholder="Topic name" required value={topicName} onChange={(event) => setTopicName(event.target.value)} />
            <button className="primary-btn" type="submit" disabled={saving}>Add topic</button>
          </form>
        </section>

        <section className="panel-box admin-panel">
          <h2>Quizzes and question bank</h2>
          <form className="admin-form" onSubmit={handleCreateQuiz}>
            <h3>Create draft quiz</h3>
            <input placeholder="Quiz title" required value={quizForm.title} onChange={(event) => setQuizForm({ ...quizForm, title: event.target.value })} />
            <input placeholder="Description" value={quizForm.description} onChange={(event) => setQuizForm({ ...quizForm, description: event.target.value })} />
            <select value={quizForm.difficulty} onChange={(event) => setQuizForm({ ...quizForm, difficulty: event.target.value })}>
              {['Easy', 'Medium', 'Hard'].map((level) => <option key={level}>{level}</option>)}
            </select>
            <input type="number" min="1" max="600" value={quizForm.timeLimit} onChange={(event) => setQuizForm({ ...quizForm, timeLimit: event.target.value })} aria-label="Duration in minutes" />
            <select value={quizForm.quizType} onChange={(event) => setQuizForm({ ...quizForm, quizType: event.target.value })}>
              <option value="practice">Practice</option>
              <option value="mock">Mock test</option>
            </select>
            <input type="number" min="1" placeholder="Question count (blank = all)" value={quizForm.questionCount} onChange={(event) => setQuizForm({ ...quizForm, questionCount: event.target.value })} />
            <label className="check-label">
              <input type="checkbox" checked={quizForm.negativeMarking} onChange={(event) => setQuizForm({ ...quizForm, negativeMarking: event.target.checked })} />
              Enable negative marking
            </label>
            <button className="primary-btn" type="submit" disabled={saving}>Create draft quiz</button>
          </form>

          <label className="admin-form">
            Select quiz
            <select value={selectedQuizId} onChange={(event) => setSelectedQuizId(event.target.value)}>
              <option value="">Choose quiz</option>
              {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title} ({quiz.isPublished ? 'published' : 'draft'})</option>)}
            </select>
          </label>
          {selectedQuiz ? (
            <>
              <div className="admin-list-row">
                <strong>{selectedQuiz.title}</strong>
                <button
                  className="secondary-btn small-btn"
                  disabled={saving || (!selectedQuiz.isPublished && !selectedQuiz.questions.some((question) => question.status === 'published'))}
                  onClick={() => void perform(
                    () => updateQuiz(selectedQuiz.id, { isPublished: !selectedQuiz.isPublished }),
                    selectedQuiz.isPublished ? 'Quiz unpublished.' : 'Quiz published.',
                  )}
                >
                  {selectedQuiz.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button className="secondary-btn small-btn" onClick={() => void perform(() => archiveQuiz(selectedQuiz.id), 'Quiz archived.')}>Archive</button>
              </div>
              <form className="admin-form" onSubmit={handleAddQuestion}>
                <h3>Add reviewed question</h3>
                <textarea placeholder="Question text" required value={questionForm.question} onChange={(event) => setQuestionForm({ ...questionForm, question: event.target.value })} />
                {['optionA', 'optionB', 'optionC', 'optionD'].map((field, index) => (
                  <input key={field} placeholder={`Option ${String.fromCharCode(65 + index)}`} required value={questionForm[field]} onChange={(event) => setQuestionForm({ ...questionForm, [field]: event.target.value })} />
                ))}
                <input placeholder="Correct answer (exact option text)" required value={questionForm.correctAnswer} onChange={(event) => setQuestionForm({ ...questionForm, correctAnswer: event.target.value })} />
                <textarea placeholder="Explanation" value={questionForm.explanation} onChange={(event) => setQuestionForm({ ...questionForm, explanation: event.target.value })} />
                <div className="admin-inline-fields">
                  <select value={questionForm.difficulty} onChange={(event) => setQuestionForm({ ...questionForm, difficulty: event.target.value })}>
                    {['Easy', 'Medium', 'Hard'].map((level) => <option key={level}>{level}</option>)}
                  </select>
                  <input type="number" min="0" step="0.25" aria-label="Marks" value={questionForm.marks} onChange={(event) => setQuestionForm({ ...questionForm, marks: event.target.value })} />
                  <input type="number" min="0" step="0.25" aria-label="Negative marks" value={questionForm.negativeMarks} onChange={(event) => setQuestionForm({ ...questionForm, negativeMarks: event.target.value })} />
                </div>
                <button className="primary-btn" type="submit" disabled={saving}>Add as draft</button>
              </form>
              <form className="admin-form" onSubmit={handleCsvImport}>
                <h3>Import CSV</h3>
                <p>Required columns: question, optionA, optionB, optionC, optionD, correctAnswer. Optional: explanation, difficulty, marks, negativeMarks, topicId, source.</p>
                <input type="file" accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] || null)} />
                <button className="secondary-btn" type="submit" disabled={saving || !csvFile}>Import as drafts</button>
              </form>
              <div className="admin-question-list">
                {selectedQuiz.questions.map((question) => (
                  <div className="admin-list-row" key={question.id}>
                    <span><strong>{question.question}</strong><small>{question.status} · {question.difficulty} · {question.source}</small></span>
                    <button
                      className="secondary-btn small-btn"
                      disabled={saving}
                      onClick={() => void perform(
                        () => updateQuizQuestion(selectedQuiz.id, question.id, { status: question.status === 'published' ? 'draft' : 'published' }),
                        question.status === 'published' ? 'Question moved to draft.' : 'Question published.',
                      )}
                    >
                      {question.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button className="secondary-btn small-btn" onClick={() => void perform(() => deleteQuizQuestion(selectedQuiz.id, question.id), 'Question deleted.')}>Delete</button>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </div>

      <section className="admin-panels">
        <div className="panel-box admin-panel">
          <h2>Students</h2>
          {users.map((account) => (
            <div className="admin-list-row" key={account._id}>
              <span><strong>{account.name}</strong><small>{account.email}</small></span>
              <span>{account.role}</span>
            </div>
          ))}
          {!users.length ? <p>No student accounts yet.</p> : null}
        </div>
        <div className="panel-box admin-panel">
          <h2>Recent attempts</h2>
          {attempts.map((attempt) => (
            <div className="admin-list-row" key={attempt.id}>
              <span><strong>{attempt.student?.name || 'Former student'}</strong><small>{attempt.quiz?.title || 'Archived quiz'}</small></span>
              <span>{attempt.score}/{attempt.totalMarks} · {attempt.percentage}%</span>
            </div>
          ))}
          {!attempts.length ? <p>No quiz attempts yet.</p> : null}
        </div>
      </section>
    </section>
  );
}
