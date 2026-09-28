// import utilities 
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";


// import components
import HomePage from './components/layout/HomePage'
import PageNotFound from './components/layout/PageNotFound'




// import assets

import './App.css'






function App() {

  return (
      <Router>
          <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="*" element={<PageNotFound />} />
          </Routes>
      </Router>
  )
}

export default App
