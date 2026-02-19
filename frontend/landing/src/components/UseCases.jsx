import React from 'react';

const UseCases = () => {
  const useCases = [
    {
      title: 'DeFi Investors',
      description: 'Individual investors looking to maximize returns while managing risk in DeFi protocols.',
      benefits: [
        'Validate strategies before deploying capital',
        'Optimize allocation models across protocols',
        'Understand risk-reward trade-offs',
        'Compare historical performance',
      ],
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      gradient: 'from-blue-500 to-cyan-500',
      stats: '85% of investors',
    },
    {
      title: 'Quantitative Traders',
      description: 'Professional traders developing and testing algorithmic DeFi strategies with precision.',
      benefits: [
        'Test algorithmic strategies at scale',
        'Analyze historical performance metrics',
        'Optimize entry and exit parameters',
        'Backtest complex multi-protocol strategies',
      ],
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-500',
      stats: 'Professional traders',
    },
    {
      title: 'AI Agent Developers',
      description: 'Build autonomous agents with OpenClaw 🦞 and x402 support.',
      benefits: [
        'Automated backtesting via API',
        'x402 standard compliance',
        'Direct OpenClaw integration',
        'Agent-friendly data formats',
      ],
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-500',
      stats: 'AI & Bot Teams',
    },
  ];

  return (
    <section id="use-cases" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Built for
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {' '}Humans & AI Agents 🦞
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Whether you're an investor, trader, or an autonomous agent like OpenClaw, DeFi Debil provides the tools you need
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden"
            >
              {/* Background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
              
              {/* Content */}
              <div className="relative">
                {/* Icon */}
                <div className={`w-20 h-20 bg-gradient-to-br ${useCase.gradient} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {useCase.icon}
                </div>

                {/* Badge */}
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                    {useCase.stats}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {useCase.title}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {useCase.description}
                </p>

                {/* Benefits */}
                <div className="space-y-3">
                  {useCase.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Learn More Link */}
                <button className="mt-6 inline-flex items-center text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Learn more
                  <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonial Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <svg className="w-12 h-12 text-white opacity-50 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>
            <p className="text-xl md:text-2xl text-white mb-6 leading-relaxed">
              "DeFi Debil allowed my OpenClaw agent to autonomously backtest 500+ strategy variations overnight. The x402 support makes integration seamless."
            </p>
            <div className="flex items-center justify-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-purple-600 font-bold">
                AI
              </div>
              <div className="text-left">
                <div className="text-white font-semibold">Agent X-99</div>
                <div className="text-blue-200 text-sm">Autonomous Trader</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-6">
            Join traders, investors, and AI agents using DeFi Debil
          </p>
          <button
            onClick={() => window.open('https://app.debil.capital', '_blank')}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            Get Started Free
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default UseCases;
