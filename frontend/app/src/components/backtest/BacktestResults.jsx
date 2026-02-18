import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, Activity, DollarSign, PieChart, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

// Helper to format currency
const fmtUSD = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

const fmtPct = (val) => {
  return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
};

const MetricCard = ({ title, value, subValue, icon: Icon, trend }) => (
  <Card className="border border-gray-100 shadow-sm bg-white/50 backdrop-blur-sm hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : trend === 'down' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <Badge variant="outline" className={`${trend === 'up' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {trend === 'up' ? 'Profitable' : 'Loss'}
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {subValue && <p className="text-sm text-gray-500 font-medium">{subValue}</p>}
      </div>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-gray-100 shadow-xl rounded-xl p-4 min-w-[200px]">
        <p className="text-sm font-semibold text-gray-500 mb-2">Step {label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm font-medium text-gray-700">{entry.name}</span>
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: entry.color }}>
              {fmtUSD(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const BacktestResults = ({ results, onBack }) => {
  const [selectedTab, setSelectedTab] = useState('overview'); // 'overview' or strategy index

  // If single result, wrap in array but treat as single strategy
  const isBatch = Array.isArray(results);
  const data = isBatch ? results : [results];

  // Calculate Aggregate Stats
  const aggregateStats = useMemo(() => {
    let totalInitial = 0;
    let totalFinal = 0;
    let totalPnL = 0;

    data.forEach((res) => {
      // Approximate initial from summary logic (final - pnl)
      const initial = res.summary.final_equity_usd - res.summary.final_pnl_usd;
      totalInitial += initial;
      totalFinal += res.summary.final_equity_usd;
      totalPnL += res.summary.final_pnl_usd;
    });

    const roi = totalInitial > 0 ? (totalPnL / totalInitial) * 100 : 0;
    // Weighted APY (simplified average for now)
    const avgApy = data.reduce((acc, res) => acc + res.summary.apy_percentage, 0) / data.length;

    return {
      initial: totalInitial,
      final: totalFinal,
      pnl: totalPnL,
      roi,
      apy: avgApy,
    };
  }, [data]);

  // Prepare Chart Data
  // We need to normalize steps. Assuming all backtests have roughly same number of steps or we align them by index/time.
  // For simplicity, we align by step index.
  const chartData = useMemo(() => {
    const maxSteps = Math.max(...data.map(d => d.steps.length));
    const merged = [];

    for (let i = 0; i < maxSteps; i++) {
      const point = { step: i };
      let totalEquity = 0;

      data.forEach((res, idx) => {
        const step = res.steps[i] || res.steps[res.steps.length - 1]; // Hold last value if ended
        // Try to find equity field. 
        // Lending: final_equity_usd is calculated in summary, but steps have supply/borrow. 
        // We need to approximate step equity if not explicit.
        // The API backend puts different things in 'steps'.
        // Let's look at the backend code reminders:
        // CLMM: steps have 'hold_value_usd', 'position_value_usd', 'fees_usd_cumulative'
        // Perp: steps have 'equity'
        // Lending: steps have 'supply_bnb', 'borrow_usdc', etc. Need to calculate value.
        
        let equity = 0;
        if (step.equity !== undefined) {
           equity = step.equity;
        } else if (step.position_value_usd !== undefined) {
           equity = step.position_value_usd + (step.fees_usd_cumulative || 0);
        } else if (step.supply_bnb !== undefined || step.supply_usdc !== undefined) {
           // Lending logic reconstruction
           // We need to know if it was supply BNB or USDC. 
           // This info is missing in the step object itself, but present in the request.
           // However, we don't have the request here easily.
           // Heuristic: check which keys exist.
           const price_bnb = 300.0; // Hardcoded in backend too
           if (step.supply_bnb !== undefined) {
              equity = (step.supply_bnb * price_bnb) - step.borrow_usdc;
           } else {
              equity = step.supply_usdc - (step.borrow_bnb * price_bnb);
           }
        }

        point[`strategy_${idx}`] = equity;
        totalEquity += equity;
      });

      point.total = totalEquity;
      merged.push(point);
    }
    return merged;
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Backtest Results</h1>
              <p className="text-sm text-gray-500">
                {data.length} Strateg{data.length > 1 ? 'ies' : 'y'} Simulated
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>
              Adjust Configuration
            </Button>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20 border-0">
              Deploy Strategy
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <MetricCard 
              title="Total PnL" 
              value={fmtUSD(aggregateStats.pnl)} 
              subValue={`${fmtPct(aggregateStats.roi)} Return`}
              icon={DollarSign}
              trend={aggregateStats.pnl >= 0 ? 'up' : 'down'}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <MetricCard 
              title="Final Equity" 
              value={fmtUSD(aggregateStats.final)} 
              subValue={`Initial: ${fmtUSD(aggregateStats.initial)}`}
              icon={Layers}
              trend="neutral"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <MetricCard 
              title="APR (Projected)" 
              value={fmtPct(aggregateStats.apy)} 
              subValue="Annualized based on duration"
              icon={Activity}
              trend="up"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <MetricCard 
              title="Strategies" 
              value={data.length.toString()} 
              subValue="Active Positions"
              icon={PieChart}
              trend="neutral"
            />
          </motion.div>
        </div>

        {/* Main Chart Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Equity Curve</h2>
              <p className="text-sm text-gray-500">Portfolio value performance over time</p>
            </div>
            
            {/* Tabs for switching views */}
            <div className="flex bg-gray-100/80 p-1 rounded-lg">
              <button
                onClick={() => setSelectedTab('overview')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${selectedTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Overview
              </button>
              {data.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTab(idx)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${selectedTab === idx ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Strategy {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[400px] w-full p-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  {data.map((_, idx) => (
                    <linearGradient key={idx} id={`colorStrat${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={`hsl(${idx * 120}, 70%, 50%)`} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={`hsl(${idx * 120}, 70%, 50%)`} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="step" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `T${val}`}
                  minTickGap={50}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val.toFixed(0)}`}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {selectedTab === 'overview' ? (
                  <>
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      name="Total Portfolio"
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                      animationDuration={1500}
                    />
                    {data.length > 1 && data.map((_, idx) => (
                      <Area
                        key={idx}
                        type="monotone"
                        dataKey={`strategy_${idx}`}
                        name={`Strategy ${idx + 1}`}
                        stroke={`hsl(${idx * 120}, 70%, 50%)`}
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        fill="none"
                        opacity={0.5}
                      />
                    ))}
                  </>
                ) : (
                  <Area 
                    type="monotone" 
                    dataKey={`strategy_${selectedTab}`} 
                    name={`Strategy ${selectedTab + 1}`}
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    animationDuration={1500}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Individual Strategy Breakdown */}
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 px-1">Strategy Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.map((res, idx) => (
                    <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.6 + (idx * 0.1) }}
                    >
                        <Card className="border-gray-200 hover:border-blue-300 transition-colors cursor-pointer group">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">
                                    Strategy #{idx + 1}
                                </CardTitle>
                                <Badge variant="secondary" className="bg-gray-100 text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    {fmtPct(res.summary.roi_percentage)} ROI
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold mb-1">{fmtUSD(res.summary.final_pnl_usd)}</div>
                                <p className="text-xs text-muted-foreground mb-4">Net Profit/Loss</p>
                                <div className="h-[60px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <Line 
                                                type="monotone" 
                                                dataKey={`strategy_${idx}`} 
                                                stroke={res.summary.final_pnl_usd >= 0 ? "#10b981" : "#f43f5e"} 
                                                strokeWidth={2} 
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
