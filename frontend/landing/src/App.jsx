import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import UseCases from './components/UseCases';
import Stats from './components/Stats';
import Pricing from './components/Pricing';
import Demo from './components/Demo';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <div className="App">
        {/* Fixed Navigation */}
        <Navbar />

        {/* Main Content */}
        <main>
          <Hero />
          <Features />
          <HowItWorks />
          <UseCases />
          <Stats />
          <Pricing />
          <Demo />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
