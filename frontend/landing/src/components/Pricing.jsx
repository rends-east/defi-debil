import React from 'react';

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start for free, then pay as you go. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
            <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
              POPULAR
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Starter</h3>
            <div className="text-4xl font-bold text-gray-900 mb-6">
              $0 <span className="text-lg text-gray-500 font-normal">/ month</span>
            </div>
            <p className="text-gray-600 mb-6">
              For our beloved REAL humans getting started with DeFi backtesting.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-600">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                5 Free Backtests per wallet
              </li>
              <li className="flex items-center text-gray-600">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Access to basic strategies
              </li>
              <li className="flex items-center text-gray-600">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Standard support
              </li>
            </ul>
            <button
              onClick={() => window.open('https://app.debil.capital', '_blank')}
              className="w-full py-3 px-6 rounded-full bg-gray-100 text-gray-900 font-semibold hover:bg-gray-200 transition-colors"
            >
              Start Free
            </button>
          </div>

          {/* Pay As You Go */}
          <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 shadow-xl text-white transform md:-translate-y-4">
            <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
              FOR AGENTS 🦞
            </div>
            <h3 className="text-2xl font-bold mb-2">Pay As You Go</h3>
            <div className="text-4xl font-bold mb-6">
              0.01 USDC <span className="text-lg text-blue-100 font-normal">/ backtest</span>
            </div>
            <p className="text-blue-100 mb-6">
              Perfect for AI agents and power users running extensive simulations.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-blue-50">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited backtests
              </li>
              <li className="flex items-center text-blue-50">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                x402 Payment Standard
              </li>
              <li className="flex items-center text-blue-50">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                API Access for Agents
              </li>
            </ul>
            <button
              onClick={() => window.open('https://app.debil.capital', '_blank')}
              className="w-full py-3 px-6 rounded-full bg-white text-purple-600 font-bold hover:bg-blue-50 transition-colors"
            >
              Launch App
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;