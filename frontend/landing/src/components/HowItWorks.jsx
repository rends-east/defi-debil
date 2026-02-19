import React from 'react';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      title: 'Select Strategy',
      description: (
        <>
          Choose from lending, yield farming, or have your{' '}
          <a href="/llms.txt" target="_blank" className="text-blue-600 hover:underline">
            OpenClaw 🦞
          </a>{' '}
          agent auto-select. Pick your protocol and time range.
        </>
      ),
      features: ['Venus Lending', 'PancakeSwap LP', 'OpenClaw Compatible', 'Aster Perps'],
      mockup: (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 h-48 flex flex-col justify-center">
          <div className="space-y-3">
            {['Lending Strategy', 'Yield Farming', 'AI Agent (x402)'].map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  i === 2 ? 'bg-purple-600 text-white' : 'bg-white text-gray-700'
                } transition-all`}
              >
                <span className="font-medium text-sm">{item}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      number: '02',
      title: 'Configure Parameters',
      description: 'Set allocation amounts and risk parameters manually or via x402 config files.',
      features: ['Amount & Duration', 'Risk Limits', 'x402 Config', 'Rebalancing'],
      mockup: (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 h-48 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Supply Amount</span>
              <span className="text-sm font-semibold text-purple-600">10 BNB</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-gradient-to-r from-purple-600 to-pink-600"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Agent Mode</span>
              <span className="text-sm font-semibold text-purple-600">Active 🦞</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse"></div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <div className="flex-1 bg-white rounded-lg p-2 text-center">
              <span className="text-xs text-gray-600">Risk</span>
              <div className="text-sm font-semibold text-green-600">Low</div>
            </div>
            <div className="flex-1 bg-white rounded-lg p-2 text-center">
              <span className="text-xs text-gray-600">APY</span>
              <div className="text-sm font-semibold text-blue-600">12%</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      number: '03',
      title: 'Analyze Results',
      description: 'Review performance metrics. Agents receive JSON results via x402 callback.',
      features: ['P&L Analysis', 'Risk Metrics', 'JSON Export', 'Strategy Comparison'],
      mockup: (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 h-48 flex flex-col justify-between">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white rounded-lg p-2">
              <div className="text-xs text-gray-600 mb-1">Total Return</div>
              <div className="text-lg font-bold text-green-600">+24.5%</div>
            </div>
            <div className="bg-white rounded-lg p-2">
              <div className="text-xs text-gray-600 mb-1">Max DD</div>
              <div className="text-lg font-bold text-red-600">-5.2%</div>
            </div>
            <div className="bg-white rounded-lg p-2">
              <div className="text-xs text-gray-600 mb-1">Sharpe</div>
              <div className="text-lg font-bold text-blue-600">1.85</div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="flex items-end justify-between h-16 gap-1">
              {[30, 45, 35, 60, 50, 70, 55, 80, 65, 85, 75, 90].map((height, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-green-400 to-emerald-500 rounded-t"
                  style={{ height: `${height}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Three simple steps for humans or AI agents to backtest strategies
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-24">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
              } items-center gap-12`}
            >
              {/* Content */}
              <div className="flex-1">
                <div className="mb-6">
                  <span className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  {step.description}
                </p>

                {/* Features list */}
                <div className="grid grid-cols-2 gap-3">
                  {step.features.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-2 text-gray-700"
                    >
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mockup Visual */}
              <div className="flex-1 w-full">
                <div className="relative">
                  {step.mockup}
                  
                  {/* Decorative elements */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-10 blur-2xl"></div>
                  <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 blur-2xl"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-8"> 
          <p className="text-gray-600 mb-6">
            Simple, powerful, and built for DeFi traders & Agents
          </p>
          <button
            onClick={() => window.open('https://app.debil.capital', '_blank')}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            Start Backtesting Now
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
