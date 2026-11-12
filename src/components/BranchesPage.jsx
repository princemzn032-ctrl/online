import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBranches, getQuizzes, getSubjects, getTopics } from '../api';
import { getTypicalSubjectCount } from '../lib/branchMetrics';

export default function BranchesPage() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [topicsBySubject, setTopicsBySubject] = useState({});
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getBranches()
      .then((items) => { if (active) setBranches(items); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load branches.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedBranch || !selectedSemester) return undefined;
    let active = true;
    setError('');
    setSubjects([]);
    setQuizzes([]);
    Promise.all([
      getSubjects({ branchId: selectedBranch.id, semesterId: selectedSemester.id }),
      getQuizzes({ branchId: selectedBranch.id, semesterId: selectedSemester.id }),
    ])
      .then(([nextSubjects, nextQuizzes]) => {
        if (!active) return;
        setSubjects(nextSubjects);
        setQuizzes(nextQuizzes);
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load semester content.'); });
    return () => { active = false; };
  }, [selectedBranch, selectedSemester]);

  const handleSubject = async (subject) => {
    if (topicsBySubject[subject.id]) return;
    try {
      const topics = await getTopics(subject.id);
      setTopicsBySubject((previous) => ({ ...previous, [subject.id]: topics }));
    } catch (requestError) {
      setError(requestError.message || 'Unable to load subject topics.');
    }
  };

  return (
    <section className="container catalog-page">
      <header className="section-heading">
        <span className="eyebrow">Engineering branches</span>
        <h1>Choose your path</h1>
        <p>Browse branch and semester subjects. Starter material is identified as sample content.</p>
      </header>

      {error ? <div className="form-message error" role="alert">{error}</div> : null}
      {loading ? <div className="panel-box empty-state"><h3>Loading branches...</h3></div> : null}
      {!loading && branches.length === 0 && !error ? (
        <div className="panel-box empty-state">
          <h3>No branches have been configured yet.</h3>
          <p>Run the database seed command or ask an administrator to add branches.</p>
        </div>
      ) : null}

      <div className="branch-grid">
        {branches.map((branch) => (
          <button
            type="button"
            className={`branch-card ${selectedBranch?.id === branch.id ? 'selected' : ''}`}
            key={branch.id}
            onClick={() => {
              setSelectedBranch(branch);
              setSelectedSemester(null);
              setSubjects([]);
              setQuizzes([]);
              setTopicsBySubject({});
            }}
          >
            <span className="branch-icon"><GraduationCap size={22} /></span>
            <span className="branch-code">{branch.code}</span>
            <strong>{branch.name}</strong>
            <span>{branch.description}</span>
            <small>{branch.semesters.length} semesters · typical syllabus: {getTypicalSubjectCount(branch)} subjects</small>
          </button>
        ))}
      </div>

      {selectedBranch ? (
        <section className="catalog-section panel-box">
          <div className="panel-header">
            <div>
              <span className="eyebrow">{selectedBranch.code}</span>
              <h2>{selectedBranch.name}</h2>
            </div>
          </div>
          <div className="semester-grid">
            {selectedBranch.semesters.map((semester) => (
              <button
                type="button"
                key={semester.id}
                className={`semester-chip ${selectedSemester?.id === semester.id ? 'selected' : ''}`}
                onClick={() => setSelectedSemester(semester)}
              >
                <strong>Semester {semester.number}</strong>
                <span>{semester.subjectCount} subjects</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedSemester ? (
        <section className="catalog-section">
          <div className="section-heading">
            <span className="eyebrow">Semester {selectedSemester.number}</span>
            <h2>Subjects and practice quizzes</h2>
          </div>
          <div className="subject-grid">
            {subjects.map((subject) => (
              <article className="subject-card panel-box" key={subject.id}>
                <BookOpen size={20} />
                <h3>{subject.name}</h3>
                {subject.isCommon ? <span className="tag">Common first-year subject</span> : null}
                <p>{subject.description || 'Subject topics can be configured by your university administrator.'}</p>
                <button className="text-action" type="button" onClick={() => handleSubject(subject)}>
                  {topicsBySubject[subject.id] ? 'Topics loaded' : 'View topics'} <ArrowRight size={16} />
                </button>
                {topicsBySubject[subject.id]?.length ? (
                  <ul className="topic-list">
                    {topicsBySubject[subject.id].map((topic) => <li key={topic.id}>{topic.name}</li>)}
                  </ul>
                ) : null}
              </article>
            ))}
            {!subjects.length ? <div className="panel-box empty-state">No subjects are configured for this semester yet.</div> : null}
          </div>

          <div className="quiz-list-panel catalog-quizzes">
            {quizzes.map((quiz) => (
              <article className="quiz-card" key={quiz.id}>
                <div className="quiz-card-top">
                  <span className="difficulty-pill green">{quiz.difficulty}</span>
                  <strong>{quiz.totalMarks} marks</strong>
                </div>
                <h3>{quiz.title}</h3>
                <p>{quiz.description}</p>
                <div className="quiz-meta-grid">
                  <span>{quiz.category}</span>
                  <span>{quiz.questions.length} questions</span>
                  <span>{quiz.timeLimit} min</span>
                </div>
                <button className="primary-btn small-btn" onClick={() => navigate(`/quizzes?branchId=${selectedBranch.id}&semesterId=${selectedSemester.id}&subjectId=${quiz.subjectId}`)}>
                  Explore practice
                </button>
              </article>
            ))}
            {!quizzes.length ? (
              <div className="panel-box empty-state">
                <h3>No published quizzes for this semester yet.</h3>
                <p>Administrators can add reviewed questions and publish subject quizzes.</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}
