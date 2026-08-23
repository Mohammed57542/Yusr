import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Grades from './pages/Grades.jsx';
import GradeDetail from './pages/GradeDetail.jsx';
import Subjects from './pages/Subjects.jsx';
import SubjectDetail from './pages/SubjectDetail.jsx';
import LessonDetail from './pages/LessonDetail.jsx';
import LessonsList from './pages/LessonsList.jsx';
import LiveSessions from './pages/LiveSessions.jsx';
import Recordings from './pages/Recordings.jsx';
import LiveClassroom from './pages/LiveClassroom.jsx';
import Exams from './pages/Exams.jsx';
import ExamTake from './pages/ExamTake.jsx';
import QuestionBank from './pages/QuestionBank.jsx';
import Library from './pages/Library.jsx';
import Reviews from './pages/Reviews.jsx';
import Groups from './pages/Groups.jsx';
import Offers from './pages/Offers.jsx';
import Pricing from './pages/Pricing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import MyResults from './pages/MyResults.jsx';
import Favorites from './pages/Favorites.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Notifications from './pages/Notifications.jsx';
import Teachers from './pages/Teachers.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import Admin from './pages/Admin.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import AIChat from './pages/AIChat.jsx';

import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/grades" element={<Grades />} />
        <Route path="/grades/:id" element={<GradeDetail />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/:id" element={<SubjectDetail />} />
        <Route path="/lessons" element={<LessonsList />} />
        <Route path="/lessons/:id" element={<LessonDetail />} />
        <Route path="/live-sessions" element={<LiveSessions />} />
        <Route path="/recordings" element={<Recordings />} />
        <Route path="/live/:id" element={<LiveClassroom />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/exams/:id/take" element={<ExamTake />} />
        <Route path="/question-bank" element={<QuestionBank />} />
        <Route path="/library" element={<Library />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/my-results" element={<MyResults />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/ai-assistant" element={<AIChat />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
