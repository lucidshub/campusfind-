import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Browse from './pages/Browse'
import ReportItem from './pages/ReportItem'
import ItemDetails from './pages/ItemDetails'
import ThemeToggle from './components/ThemeToggle'
import './App.css'

function App() {
  const location = useLocation()

  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="nav-brand">CampusFind</Link>
        <div className="nav-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
          <Link to="/browse" className={location.pathname === '/browse' ? 'active' : ''}>Browse</Link>
        </div>
        <div className="nav-action">
          <Link to="/report" className="nav-report-btn">+ Report Item</Link>
          <ThemeToggle />
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/report" element={<ReportItem />} />
          <Route path="/item/:id" element={<ItemDetails />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>CampusFind — Help your fellow students find their lost items</p>
      </footer>
    </div>
  )
}

export default App
