import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, Layers, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  income: number;
  expense: number;
  paidOut: number;
  bankBal: number;
  timeframe: 'month' | 'all';
  setTimeframe: (tf: 'month' | 'all') => void;
}

export const ThreeDFinancialChart: React.FC<Props> = ({
  income,
  expense,
  paidOut,
  bankBal,
  timeframe,
  setTimeframe,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Dynamic net cashflow: Income minus (Expense + PaidOut)
  const netDelta = income - expense - paidOut;
  const isNetPositive = netDelta >= 0;

  // Maximum value across metrics for proportional 3D scaling (strictly 0 if all are 0)
  const maxVal = Math.max(income, expense, paidOut, bankBal, 0);

  // 4 Metrics Configuration
  const items = [
    {
      id: 'income',
      label: 'Income',
      sign: '+',
      val: income,
      prefix: '+',
      colorName: 'emerald',
      textColor: 'text-emerald-600',
      labelColor: '#059669',
      gradBody: 'url(#emerald3dBody)',
      gradTop: 'url(#emerald3dTop)',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'expense',
      label: 'Expense',
      sign: '-',
      val: expense,
      prefix: '-',
      colorName: 'rose',
      textColor: 'text-rose-600',
      labelColor: '#e11d48',
      gradBody: 'url(#rose3dBody)',
      gradTop: 'url(#rose3dTop)',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      id: 'paidOut',
      label: 'Paid Out',
      sign: '-',
      val: paidOut,
      prefix: '-',
      colorName: 'sky',
      textColor: 'text-sky-600',
      labelColor: '#0284c7',
      gradBody: 'url(#sky3dBody)',
      gradTop: 'url(#sky3dTop)',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    {
      id: 'bankBal',
      label: 'Bank Bal',
      sign: '',
      val: bankBal,
      prefix: '',
      colorName: 'violet',
      textColor: 'text-violet-600',
      labelColor: '#7c3aed',
      gradBody: 'url(#violet3dBody)',
      gradTop: 'url(#violet3dTop)',
      badgeBg: 'bg-violet-50 text-violet-700 border-violet-200',
    },
  ];

  // SVG Geometry Constants
  const SVG_WIDTH = 380;
  const SVG_HEIGHT = 210;
  const BASE_Y = 158; // Ground plane baseline
  const MAX_HEIGHT = 100; // Max pillar height
  const RX = 21; // Radius X of 3D cylinder
  const RY = 6.2; // Radius Y of 3D cylinder
  const COL_X = [55, 145, 235, 325]; // Centers of the 4 columns

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
      {/* Header with Title and Timeframe Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              3D Financial Overview
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              <Layers className="w-3 h-3" />
              <span>Isometric 3D</span>
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight mt-0.5">
            Income vs Expense Pulse
          </h3>
        </div>

        {/* Timeframe switch: All Time vs This Month */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              timeframe === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All-Time
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              timeframe === 'month'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Net Delta / Plus & Minus Summary Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 rounded-2xl border border-slate-200/70 mb-2">
        <span className="text-[11px] font-semibold text-slate-500">
          Net Cashflow Delta:
        </span>
        {netDelta === 0 ? (
          <span className="text-xs font-mono font-bold text-slate-600">
            ₹0.00 (Neutral Flow)
          </span>
        ) : isNetPositive ? (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
            <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+{formatCurrency(netDelta)} Net Surplus</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-rose-700 bg-rose-100/70 border border-rose-200 px-2.5 py-0.5 rounded-lg">
            <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>-{formatCurrency(Math.abs(netDelta))} Net Deficit</span>
          </span>
        )}
      </div>

      {/* 3D Isometric Cylinder Stage */}
      <div className="relative w-full overflow-hidden flex items-center justify-center pt-1 pb-2">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto max-h-[220px] select-none"
        >
          <defs>
            {/* 3D Emerald Cylinder (Income) */}
            <linearGradient id="emerald3dBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="25%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="emerald3dTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* 3D Rose/Coral Cylinder (Expense) */}
            <linearGradient id="rose3dBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="25%" stopColor="#f43f5e" />
              <stop offset="70%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>
            <linearGradient id="rose3dTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fecdd3" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>

            {/* 3D Sky/Blue Cylinder (Paid Out) */}
            <linearGradient id="sky3dBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="25%" stopColor="#0284c7" />
              <stop offset="70%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#075985" />
            </linearGradient>
            <linearGradient id="sky3dTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            {/* 3D Violet/Indigo Cylinder (Bank Bal) */}
            <linearGradient id="violet3dBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="25%" stopColor="#8b5cf6" />
              <stop offset="70%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#5b21b6" />
            </linearGradient>
            <linearGradient id="violet3dTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ddd6fe" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>

            {/* Soft Floor Shadow Filter */}
            <filter id="floorShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.18 0"
              />
            </filter>
          </defs>

          {/* 3D Perspective Ground Plane / Grid */}
          <g opacity="0.6">
            {/* Vanishing Horizon lines */}
            <line x1="20" y1={BASE_Y} x2={SVG_WIDTH - 20} y2={BASE_Y} stroke="#e2e8f0" strokeWidth="1.2" strokeDasharray="3 3" />
            <line x1="15" y1={BASE_Y + 12} x2={SVG_WIDTH - 15} y2={BASE_Y + 12} stroke="#f1f5f9" strokeWidth="1" />
            <line x1="10" y1={BASE_Y + 24} x2={SVG_WIDTH - 10} y2={BASE_Y + 24} stroke="#f8fafc" strokeWidth="1" />
          </g>

          {/* Render 4 Columns */}
          {items.map((item, idx) => {
            const cx = COL_X[idx];
            const isHovered = hoveredIdx === idx;

            // Strict zero check: If value is 0, height is 0! No artificial minimum heights!
            const isZero = item.val <= 0;
            const pct = maxVal > 0 && item.val > 0 ? item.val / maxVal : 0;
            // Proportional height (min 6px only if positive amount exists so 3D cap is visible)
            const h = isZero ? 0 : Math.max(8, Math.round(pct * MAX_HEIGHT));
            const topY = BASE_Y - h;

            return (
              <g
                key={item.id}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-all duration-300"
              >
                {/* 1. Base Disk on Floor */}
                <ellipse
                  cx={cx}
                  cy={BASE_Y}
                  rx={RX + 2}
                  ry={RY + 1}
                  fill={isZero ? '#f1f5f9' : 'rgba(15, 23, 42, 0.08)'}
                  stroke={isZero ? '#cbd5e1' : 'none'}
                  strokeWidth={isZero ? '1.2' : '0'}
                  strokeDasharray={isZero ? '3 2' : 'none'}
                />

                {/* If Amount is 0: Renders Flat on Baseline, NO column up! */}
                {isZero ? (
                  <>
                    {/* Inactive center dot on the base plate */}
                    <circle cx={cx} cy={BASE_Y} r="3" fill="#cbd5e1" />

                    {/* Amount Label: ₹0.00 resting quietly at baseline */}
                    <text
                      x={cx}
                      y={BASE_Y - 14}
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="600"
                      fill="#94a3b8"
                    >
                      ₹0.00
                    </text>
                  </>
                ) : (
                  /* If Amount > 0: Renders Authentic 3D Cylinder rising up! */
                  <>
                    {/* Floor Drop Shadow */}
                    <ellipse
                      cx={cx}
                      cy={BASE_Y + 3}
                      rx={RX + 3}
                      ry={RY + 1.5}
                      fill="black"
                      opacity="0.14"
                      filter="url(#floorShadow)"
                    />

                    {/* 3D Cylinder Front Body */}
                    <path
                      d={`M ${cx - RX} ${topY} V ${BASE_Y} A ${RX} ${RY} 0 0 0 ${cx + RX} ${BASE_Y} V ${topY} A ${RX} ${RY} 0 0 1 ${cx - RX} ${topY} Z`}
                      fill={item.gradBody}
                      className="transition-all duration-500 ease-out"
                    />

                    {/* Specular 3D Light Stripe on Left Face */}
                    <line
                      x1={cx - RX * 0.55}
                      y1={topY + 3}
                      x2={cx - RX * 0.55}
                      y2={BASE_Y - 2}
                      stroke="rgba(255, 255, 255, 0.35)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    {/* 3D Top Cap Ellipse */}
                    <ellipse
                      cx={cx}
                      cy={topY}
                      rx={RX}
                      ry={RY}
                      fill={item.gradTop}
                      stroke="rgba(255, 255, 255, 0.65)"
                      strokeWidth="1.2"
                      className="transition-all duration-500 ease-out"
                    />

                    {/* Amount Floating Badge above Top Cap */}
                    <g transform={`translate(${cx}, ${topY - 12})`}>
                      <rect
                        x="-30"
                        y="-10"
                        width="60"
                        height="16"
                        rx="8"
                        fill={isHovered ? '#0f172a' : '#ffffff'}
                        stroke={isHovered ? '#0f172a' : '#e2e8f0'}
                        strokeWidth="1"
                        filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.06))"
                      />
                      <text
                        x="0"
                        y="2"
                        textAnchor="middle"
                        fontSize="9.5"
                        fontFamily="monospace"
                        fontWeight="700"
                        fill={isHovered ? '#ffffff' : item.labelColor}
                      >
                        {item.prefix}{formatCurrency(item.val)}
                      </text>
                    </g>
                  </>
                )}

                {/* Column Name Under Baseline Floor */}
                <text
                  x={cx}
                  y={BASE_Y + 22}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#475569"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer Info: Real-time invariant summary */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          Period: {timeframe === 'month' ? 'Current Month' : 'All-Time Records'}
        </span>
        <span className="font-semibold text-slate-700 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>Live Accurate Balance</span>
        </span>
      </div>
    </div>
  );
};
