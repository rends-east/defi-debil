import React from 'react';

const Hero = () => {
  const openApp = () => {
    window.open('https://app.debil.capital', '_blank');
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob top-0 -left-4"></div>
        <div className="absolute w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 top-0 right-4"></div>
        <div className="absolute w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 bottom-8 left-20"></div>
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="mb-8">
          {/* Badge */}
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-white bg-opacity-20 text-white text-sm font-medium backdrop-blur-sm mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            Built for BNB Chain &{' '}
            <a href="/llms.txt" target="_blank" className="hover:underline hover:text-green-300 ml-1 transition-colors">
              AI Agents 🦞
            </a>
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Backtest DeFi Strategies
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
            for Humans &{' '}
            <a href="/skills/defi-debil-backtest/SKILL.md" target="_blank" className="hover:text-white underline decoration-dotted transition-colors">
              AI Agents
            </a>
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
          Unified analytics platform with aggregated historical data. 
          Perfect for manual backtesting and autonomous agents like{' '}
          <a href="/llms.txt" target="_blank" className="font-bold hover:text-white underline decoration-dotted transition-colors">
            OpenClaw 🦞
          </a>.
          <br />
          Full support for <strong>x402</strong> standard.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={openApp}
            className="group relative px-8 py-4 bg-white text-purple-600 rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
          >
            Try Demo
            <svg
              className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

        {/* Hero Visual - Abstract Data Illustration */}
        <div className="relative max-w-5xl mx-auto">
          <div className="relative bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-20 shadow-2xl">
            {/* Mockup of analytics dashboard */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <div className="h-2 w-3/4 bg-blue-300 rounded mb-2"></div>
                <div className="h-8 w-full bg-blue-200 rounded"></div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <div className="h-2 w-2/3 bg-purple-300 rounded mb-2"></div>
                <div className="h-8 w-full bg-purple-200 rounded"></div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <div className="h-2 w-1/2 bg-pink-300 rounded mb-2"></div>
                <div className="h-8 w-full bg-pink-200 rounded"></div>
              </div>
            </div>
            
            {/* Chart mockup */}
            <div className="bg-white bg-opacity-20 rounded-lg p-6 backdrop-blur-sm">
              <div className="flex items-end justify-between h-32 gap-2">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-blue-400 to-purple-400 rounded-t opacity-80"
                    style={{ height: `${height}%` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating elements */}
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-yellow-400 rounded-full opacity-20 blur-xl animate-pulse"></div>
          <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-green-400 rounded-full opacity-20 blur-xl animate-pulse animation-delay-2000"></div>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16">
          <button
            onClick={() => {
              const element = document.getElementById('features');
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-white opacity-80 hover:opacity-100 transition-opacity animate-bounce"
          >
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  );
};

export default Hero;
