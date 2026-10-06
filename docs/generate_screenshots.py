#!/usr/bin/env python3
"""Generate crisp SVG screenshot previews for DivYield documentation."""

import os
from pathlib import Path

OUT_DIR = Path("docs/assets")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# 1. Dashboard Preview
dashboard_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560" width="960" height="560">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>
    <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="forecastGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#4f46e5" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Window Frame -->
  <rect width="960" height="560" rx="16" fill="#f1f5f9" />
  
  <!-- Header Bar -->
  <path d="M0 16 C0 7 7 0 16 0 L944 0 C953 0 960 7 960 16 L960 48 L0 48 Z" fill="#ffffff" border-bottom="1px solid #e2e8f0" />
  <circle cx="24" cy="24" r="6" fill="#ef4444" />
  <circle cx="42" cy="24" r="6" fill="#f59e0b" />
  <circle cx="60" cy="24" r="6" fill="#10b981" />
  <text x="480" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#475569" text-anchor="middle">DivYield — Desktop Dashboard</text>

  <!-- Navigation Bar -->
  <rect x="0" y="48" width="960" height="52" fill="#ffffff" />
  <line x1="0" y1="100" x2="960" y2="100" stroke="#e2e8f0" stroke-width="1" />
  
  <text x="32" y="80" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="700" fill="#0f172a">DivYield</text>
  <rect x="110" y="66" width="58" height="22" rx="11" fill="#ecfdf5" />
  <text x="139" y="81" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600" fill="#059669" text-anchor="middle">LIVE</text>
  
  <!-- Tabs -->
  <text x="210" y="81" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" fill="#2563eb">Dashboard</text>
  <rect x="210" y="97" width="68" height="3" fill="#2563eb" rx="1.5" />
  <text x="310" y="81" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="500" fill="#64748b">Holdings</text>
  <text x="390" y="81" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="500" fill="#64748b">Calendar</text>
  <text x="470" y="81" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="500" fill="#64748b">Diversification</text>
  <text x="580" y="81" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="500" fill="#64748b">Tax (Box 3)</text>
  <text x="670" y="81" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="500" fill="#64748b">Settings</text>

  <!-- Sync Button & Lock -->
  <rect x="800" y="63" width="90" height="28" rx="6" fill="#0284c7" />
  <text x="845" y="82" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">⟳ Sync Now</text>
  <rect x="900" y="63" width="28" height="28" rx="6" fill="#f1f5f9" />
  <text x="914" y="82" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">🔒</text>

  <!-- KPI Cards Row -->
  <!-- Card 1: Portfolio Value -->
  <g filter="url(#shadow)">
    <rect x="32" y="120" width="210" height="96" rx="12" fill="url(#cardGrad)" stroke="#e2e8f0" />
    <text x="48" y="144" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#64748b">PORTFOLIO VALUE</text>
    <text x="48" y="174" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="22" font-weight="700" fill="#0f172a">€142,580.40</text>
    <text x="48" y="198" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#10b981">↑ +14.8% unrealized</text>
  </g>

  <!-- Card 2: Annual Run Rate -->
  <g filter="url(#shadow)">
    <rect x="258" y="120" width="210" height="96" rx="12" fill="url(#cardGrad)" stroke="#e2e8f0" />
    <text x="274" y="144" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#64748b">ANNUAL DIVIDEND</text>
    <text x="274" y="174" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="22" font-weight="700" fill="#0f172a">€4,892.60</text>
    <text x="274" y="198" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0284c7">Run-rate forward 12M</text>
  </g>

  <!-- Card 3: Net Yield -->
  <g filter="url(#shadow)">
    <rect x="484" y="120" width="210" height="96" rx="12" fill="url(#cardGrad)" stroke="#e2e8f0" />
    <text x="500" y="144" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#64748b">DIVIDEND YIELD</text>
    <text x="500" y="174" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="22" font-weight="700" fill="#0f172a">3.43%</text>
    <text x="500" y="198" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#10b981">Weighted portfolio</text>
  </g>

  <!-- Card 4: Monthly Average -->
  <g filter="url(#shadow)">
    <rect x="710" y="120" width="218" height="96" rx="12" fill="url(#cardGrad)" stroke="#e2e8f0" />
    <text x="726" y="144" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#64748b">MONTHLY AVERAGE</text>
    <text x="726" y="174" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="22" font-weight="700" fill="#0f172a">€407.72</text>
    <text x="726" y="198" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#6366f1">Passive income pace</text>
  </g>

  <!-- Chart Card -->
  <g filter="url(#shadow)">
    <rect x="32" y="232" width="560" height="296" rx="12" fill="#ffffff" stroke="#e2e8f0" />
    <text x="52" y="262" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700" fill="#0f172a">Monthly Dividend Stream (2026)</text>
    
    <!-- Legend -->
    <rect x="380" y="252" width="10" height="10" rx="2" fill="#10b981" />
    <text x="396" y="261" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#475569">Received</text>
    <rect x="460" y="252" width="10" height="10" rx="2" fill="#6366f1" />
    <text x="476" y="261" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#475569">Forecast</text>

    <!-- Bars for 12 months -->
    <!-- Jan -->
    <rect x="68" y="410" width="26" height="70" rx="4" fill="url(#barGrad)" />
    <text x="81" y="496" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Jan</text>
    <!-- Feb -->
    <rect x="110" y="380" width="26" height="100" rx="4" fill="url(#barGrad)" />
    <text x="123" y="496" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Feb</text>
    <!-- Mar -->
    <rect x="152" y="330" width="26" height="150" rx="4" fill="url(#barGrad)" />
    <text x="165" y="496" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Mar</text>
    <!-- Apr -->
    <rect x="194" y="370" width="26" height="110" rx="4" fill="url(#barGrad)" />
    <text x="207" y="496" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Apr</text>
    <!-- May -->
    <rect x="236" y="350" width="26" height="130" rx="4" fill="url(#barGrad)" />
    <text x="249" y="496" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">May</text>
    <!-- Jun -->
    <rect x="278" y="320" width="26" height="160" rx="4" fill="url(#barGrad)" />
    <text x="291" y="496" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Jun</text>
    <!-- Jul -->
    <rect x="320" y="390" width="26" height="90" rx="4" fill="url(#barGrad)" />
    <text x="333" y="496" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Jul</text>
    <!-- Aug -->
    <rect x="362" y="375" width="26" height="105" rx="4" fill="url(#barGrad)" />
    <text x="375" y="496" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Aug</text>
    <!-- Sep -->
    <rect x="404" y="340" width="26" height="140" rx="4" fill="url(#barGrad)" />
    <text x="417" y="496" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Sep</text>
    <!-- Oct (Current / Forecast) -->
    <rect x="446" y="325" width="26" height="155" rx="4" fill="url(#forecastGrad)" />
    <text x="459" y="496" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="700" fill="#6366f1" text-anchor="middle">Oct</text>
    <!-- Nov (Forecast) -->
    <rect x="488" y="360" width="26" height="120" rx="4" fill="url(#forecastGrad)" opacity="0.85" />
    <text x="501" y="496" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Nov</text>
    <!-- Dec (Forecast) -->
    <rect x="530" y="310" width="26" height="170" rx="4" fill="url(#forecastGrad)" opacity="0.85" />
    <text x="543" y="496" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Dec</text>
  </g>

  <!-- Top Positions Card -->
  <g filter="url(#shadow)">
    <rect x="608" y="232" width="320" height="296" rx="12" fill="#ffffff" stroke="#e2e8f0" />
    <text x="628" y="262" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700" fill="#0f172a">Top Income Generators</text>
    
    <!-- Item 1 -->
    <circle cx="640" cy="298" r="14" fill="#f1f5f9" />
    <text x="640" y="303" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" fill="#2563eb" text-anchor="middle">O</text>
    <text x="664" y="295" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" fill="#0f172a">Realty Income</text>
    <text x="664" y="310" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#64748b">180 shares • 5.48%</text>
    <text x="908" y="295" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="700" fill="#0f172a" text-anchor="end">€512.40/yr</text>
    
    <!-- Item 2 -->
    <circle cx="640" cy="348" r="14" fill="#f1f5f9" />
    <text x="640" y="353" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" fill="#0284c7" text-anchor="middle">MSFT</text>
    <text x="664" y="345" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" fill="#0f172a">Microsoft Corp</text>
    <text x="664" y="360" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#64748b">125 shares • 0.82%</text>
    <text x="908" y="345" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="700" fill="#0f172a" text-anchor="end">€385.00/yr</text>

    <!-- Item 3 -->
    <circle cx="640" cy="398" r="14" fill="#f1f5f9" />
    <text x="640" y="403" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" fill="#10b981" text-anchor="middle">ASML</text>
    <text x="664" y="395" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" fill="#0f172a">ASML Holding</text>
    <text x="664" y="410" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#64748b">45 shares • 1.15%</text>
    <text x="908" y="395" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="700" fill="#0f172a" text-anchor="end">€310.50/yr</text>

    <!-- Item 4 -->
    <circle cx="640" cy="448" r="14" fill="#f1f5f9" />
    <text x="640" y="453" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" fill="#f59e0b" text-anchor="middle">MAIN</text>
    <text x="664" y="445" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" fill="#0f172a">Main Street Capital</text>
    <text x="664" y="460" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#64748b">85 shares • 6.20%</text>
    <text x="908" y="445" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="700" fill="#0f172a" text-anchor="end">€298.10/yr</text>

    <!-- Summary footer -->
    <rect x="628" y="480" width="280" height="32" rx="6" fill="#f8fafc" />
    <text x="768" y="501" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">Total 28 Holdings • 100% Read-Only Synced</text>
  </g>
</svg>
"""

# 2. Calendar Preview
calendar_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560" width="960" height="560">
  <defs>
    <linearGradient id="cardGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>
    <filter id="shadow2" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.12" />
    </filter>
  </defs>

  <!-- Window Frame -->
  <rect width="960" height="560" rx="16" fill="#f8fafc" />
  
  <!-- Header Bar -->
  <path d="M0 16 C0 7 7 0 16 0 L944 0 C953 0 960 7 960 16 L960 48 L0 48 Z" fill="#ffffff" />
  <circle cx="24" cy="24" r="6" fill="#ef4444" />
  <circle cx="42" cy="24" r="6" fill="#f59e0b" />
  <circle cx="60" cy="24" r="6" fill="#10b981" />
  <text x="480" y="28" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" fill="#475569" text-anchor="middle">DivYield — Visual Dividend Calendar</text>

  <!-- Navigation Bar -->
  <rect x="0" y="48" width="960" height="52" fill="#ffffff" />
  <line x1="0" y1="100" x2="960" y2="100" stroke="#e2e8f0" stroke-width="1" />
  <text x="32" y="80" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="700" fill="#0f172a">DivYield</text>
  
  <text x="140" y="81" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="500" fill="#64748b">Dashboard</text>
  <text x="230" y="81" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="500" fill="#64748b">Holdings</text>
  <text x="310" y="81" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" fill="#2563eb">Calendar</text>
  <rect x="310" y="97" width="58" height="3" fill="#2563eb" rx="1.5" />
  <text x="390" y="81" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="500" fill="#64748b">Diversification</text>
  <text x="500" y="81" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="500" fill="#64748b">Tax (Box 3)</text>

  <!-- Month Navigation & Controls -->
  <g transform="translate(32, 116)">
    <text x="0" y="22" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="700" fill="#0f172a">October 2026</text>
    
    <!-- Filter Chips -->
    <rect x="180" y="2" width="52" height="26" rx="6" fill="#0f172a" />
    <text x="206" y="19" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle">All</text>

    <rect x="238" y="2" width="76" height="26" rx="6" fill="#ecfdf5" stroke="#a7f3d0" />
    <text x="276" y="19" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#059669" text-anchor="middle">Confirmed</text>

    <rect x="320" y="2" width="70" height="26" rx="6" fill="#eef2ff" stroke="#c7d2fe" />
    <text x="355" y="19" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#4f46e5" text-anchor="middle">Forecast</text>
  </g>

  <!-- Totals Cards -->
  <g transform="translate(480, 114)">
    <rect x="0" y="0" width="140" height="32" rx="6" fill="#ecfdf5" stroke="#a7f3d0" />
    <text x="70" y="21" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" fill="#059669" text-anchor="middle">Paid: €312.40</text>

    <rect x="150" y="0" width="140" height="32" rx="6" fill="#eef2ff" stroke="#c7d2fe" />
    <text x="220" y="21" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" fill="#4f46e5" text-anchor="middle">Forecast: €185.20</text>

    <rect x="300" y="0" width="148" height="32" rx="6" fill="#0f172a" />
    <text x="374" y="21" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">Total: €497.60</text>
  </g>

  <!-- Weekday Headers -->
  <g transform="translate(32, 164)">
    <text x="64" y="0" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#64748b" text-anchor="middle">Mon</text>
    <text x="192" y="0" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#64748b" text-anchor="middle">Tue</text>
    <text x="320" y="0" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#64748b" text-anchor="middle">Wed</text>
    <text x="448" y="0" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#64748b" text-anchor="middle">Thu</text>
    <text x="576" y="0" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#64748b" text-anchor="middle">Fri</text>
    <text x="704" y="0" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#94a3b8" text-anchor="middle">Sat</text>
    <text x="832" y="0" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#94a3b8" text-anchor="middle">Sun</text>
  </g>

  <!-- Calendar Grid Sample (Row 1 & 2) -->
  <!-- Cell: Oct 1 -->
  <rect x="32" y="174" width="124" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="42" y="192" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">1</text>
  <rect x="40" y="202" width="108" height="22" rx="4" fill="#ecfdf5" />
  <text x="46" y="217" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="700" fill="#059669">O • €42.60</text>
  <rect x="40" y="228" width="108" height="22" rx="4" fill="#ecfdf5" />
  <text x="46" y="243" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="700" fill="#059669">MAIN • €24.80</text>

  <!-- Cell: Oct 2 -->
  <rect x="160" y="174" width="124" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="170" y="192" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">2</text>

  <!-- Cell: Oct 3 -->
  <rect x="288" y="174" width="124" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="298" y="192" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">3</text>

  <!-- Cell: Oct 4 -->
  <rect x="416" y="174" width="124" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="426" y="192" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">4</text>

  <!-- Cell: Oct 5 -->
  <rect x="544" y="174" width="124" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="554" y="192" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">5</text>

  <!-- Cell: Oct 6 (TODAY) -->
  <rect x="672" y="174" width="124" height="82" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="2" />
  <text x="682" y="192" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" fill="#1d4ed8">6 TODAY</text>
  <rect x="680" y="202" width="108" height="22" rx="4" fill="#ecfdf5" />
  <text x="686" y="217" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="700" fill="#059669">ASML • €68.20</text>

  <!-- Cell: Oct 7 -->
  <rect x="800" y="174" width="128" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="810" y="192" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">7</text>

  <!-- Row 2 -->
  <rect x="32" y="260" width="124" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="42" y="278" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">8</text>

  <rect x="160" y="260" width="124" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="170" y="278" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">9</text>

  <!-- Cell: Oct 10 (FORECAST) -->
  <rect x="288" y="260" width="124" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="298" y="278" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">10</text>
  <rect x="296" y="288" width="108" height="22" rx="4" fill="#eef2ff" stroke="#c7d2fe" />
  <text x="302" y="303" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="700" fill="#4f46e5">MSFT • €96.25 ⏱</text>

  <rect x="416" y="260" width="124" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="426" y="278" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">11</text>

  <rect x="544" y="260" width="124" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="554" y="278" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">12</text>

  <!-- Cell: Oct 13 (FORECAST) -->
  <rect x="672" y="260" width="124" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="682" y="278" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">13</text>
  <rect x="680" y="288" width="108" height="22" rx="4" fill="#eef2ff" stroke="#c7d2fe" />
  <text x="686" y="303" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="700" fill="#4f46e5">JNJ • €44.10 ⏱</text>

  <rect x="800" y="260" width="128" height="82" rx="8" fill="#ffffff" stroke="#e2e8f0" />
  <text x="810" y="278" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600" fill="#0f172a">14</text>

  <!-- Modal Preview Overlay -->
  <rect x="32" y="354" width="896" height="186" rx="12" fill="#ffffff" stroke="#e2e8f0" filter="url(#shadow2)" />
  <text x="52" y="384" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700" fill="#0f172a">Selected Day Payout Details — Tuesday, October 6, 2026</text>
  
  <rect x="52" y="404" width="856" height="56" rx="8" fill="#f8fafc" stroke="#e2e8f0" />
  <circle cx="80" cy="432" r="14" fill="#ecfdf5" />
  <text x="80" y="437" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" fill="#059669" text-anchor="middle">ASML</text>
  <text x="108" y="426" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" fill="#0f172a">ASML Holding N.V. (NL0010273215)</text>
  <text x="108" y="444" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#64748b">Verified Cash Payout • Trading 212 Deposited • 45 shares @ €1.52</text>
  <text x="888" y="437" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="700" fill="#059669" text-anchor="end">€68.20 Deposited</text>

  <rect x="52" y="470" width="856" height="56" rx="8" fill="#f8fafc" stroke="#e2e8f0" />
  <circle cx="80" cy="498" r="14" fill="#eef2ff" />
  <text x="80" y="503" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" fill="#4f46e5" text-anchor="middle">V</text>
  <text x="108" y="492" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" fill="#0f172a">Visa Inc. (US92826C8394)</text>
  <text x="108" y="510" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#64748b">Yahoo Finance Forecast • 35 shares @ $0.52 (FX converted)</text>
  <text x="888" y="503" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="700" fill="#4f46e5" text-anchor="end">€16.80 Scheduled</text>
</svg>
"""

# 3. Security & App Lock Preview
security_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 520" width="960" height="520">
  <defs>
    <linearGradient id="secCard" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>
    <filter id="shadow3" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-opacity="0.18" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="960" height="520" rx="16" fill="#0f172a" />
  
  <!-- Left Side: Desktop Lock Screen -->
  <g transform="translate(60, 50)" filter="url(#shadow3)">
    <rect width="380" height="420" rx="16" fill="url(#secCard)" />
    
    <!-- Shield Icon -->
    <circle cx="190" cy="80" r="32" fill="#eff6ff" />
    <text x="190" y="88" font-size="28" text-anchor="middle">🛡️</text>
    
    <text x="190" y="140" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="700" fill="#0f172a" text-anchor="middle">DivYield is Locked</text>
    <text x="190" y="162" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Protected by Desktop OS Keychain</text>
    
    <!-- Password Input Box -->
    <rect x="50" y="200" width="280" height="42" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="70" y="226" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="16" fill="#0f172a">••••••••••••</text>
    
    <!-- Unlock Button -->
    <rect x="50" y="260" width="280" height="44" rx="8" fill="#2563eb" />
    <text x="190" y="287" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="600" fill="#ffffff" text-anchor="middle">Unlock Application</text>
    
    <rect x="50" y="326" width="280" height="48" rx="8" fill="#f1f5f9" />
    <text x="190" y="348" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">Windows Credential Manager / macOS Keychain</text>
    <text x="190" y="364" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Never stored in plaintext</text>
  </g>

  <!-- Right Side: Mobile PIN & Biometrics -->
  <g transform="translate(520, 50)" filter="url(#shadow3)">
    <rect width="380" height="420" rx="16" fill="url(#secCard)" />
    
    <circle cx="190" cy="80" r="32" fill="#ecfdf5" />
    <text x="190" y="88" font-size="28" text-anchor="middle">📱</text>

    <text x="190" y="140" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="700" fill="#0f172a" text-anchor="middle">Android Biometric & PIN</text>
    <text x="190" y="162" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Hardware Keystore + Local Auth</text>

    <!-- PIN Dots -->
    <circle cx="130" cy="210" r="7" fill="#0f172a" />
    <circle cx="170" cy="210" r="7" fill="#0f172a" />
    <circle cx="210" cy="210" r="7" fill="#0f172a" />
    <circle cx="250" cy="210" r="7" fill="#cbd5e1" />

    <!-- Fingerprint / Face Icon -->
    <rect x="90" y="246" width="200" height="48" rx="24" fill="#059669" />
    <text x="190" y="276" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" fill="#ffffff" text-anchor="middle">👆 Tap for Fingerprint Unlock</text>

    <rect x="50" y="326" width="280" height="48" rx="8" fill="#f1f5f9" />
    <text x="190" y="348" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">Auto-Locks on Background Resume</text>
    <text x="190" y="364" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Supports Android 10 through latest (14/15)</text>
  </g>
</svg>
"""

# 4. Mobile Preview
mobile_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 780" width="460" height="780">
  <defs>
    <filter id="mShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Phone Bezel -->
  <g transform="translate(30, 20)" filter="url(#mShadow)">
    <rect width="400" height="740" rx="44" fill="#0f172a" stroke="#334155" stroke-width="4" />
    
    <!-- Screen Area -->
    <rect x="12" y="12" width="376" height="716" rx="34" fill="#faf7f2" />

    <!-- Status Bar / Dynamic Island -->
    <rect x="138" y="22" width="124" height="24" rx="12" fill="#0f172a" />
    <text x="40" y="38" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600" fill="#0f172a">09:41</text>
    <text x="350" y="38" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600" fill="#0f172a">5G 98%</text>

    <!-- Top App Bar -->
    <text x="32" y="80" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="800" fill="#18181b">DivYield</text>
    <rect x="300" y="62" width="68" height="26" rx="13" fill="#2563eb" />
    <text x="334" y="79" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">⟳ Sync</text>

    <!-- Notification Banner -->
    <rect x="24" y="104" width="352" height="68" rx="12" fill="#ffffff" stroke="#18181b" stroke-width="2" />
    <circle cx="50" cy="138" r="16" fill="#ecfdf5" />
    <text x="50" y="143" font-size="16" text-anchor="middle">🔔</text>
    <text x="76" y="128" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" fill="#0f172a">Dividend Payout Alert</text>
    <text x="76" y="144" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#475569">ASML Holding: €68.20 scheduled today</text>
    <text x="76" y="158" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="9" font-weight="600" fill="#059669">Local Notification • 09:00 AM Alarm</text>

    <!-- Portfolio Summary Card -->
    <rect x="24" y="186" width="352" height="110" rx="14" fill="#ffffff" stroke="#18181b" stroke-width="2" />
    <text x="40" y="212" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="700" fill="#64748b">TOTAL PORTFOLIO</text>
    <text x="40" y="244" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="26" font-weight="800" fill="#18181b">€142,580.40</text>
    <text x="40" y="272" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="700" fill="#10b981">↑ +€18,420.00 (+14.8%)</text>
    <text x="356" y="272" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600" fill="#2563eb" text-anchor="end">28 Assets</text>

    <!-- Annual Run Rate Card -->
    <rect x="24" y="310" width="170" height="84" rx="12" fill="#ffffff" stroke="#18181b" stroke-width="2" />
    <text x="36" y="332" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="700" fill="#64748b">ANNUAL RUN-RATE</text>
    <text x="36" y="360" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="800" fill="#18181b">€4,892.60</text>
    <text x="36" y="380" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="600" fill="#0284c7">3.43% Yield</text>

    <!-- Diversification Score Card -->
    <rect x="206" y="310" width="170" height="84" rx="12" fill="#ffffff" stroke="#18181b" stroke-width="2" />
    <text x="218" y="332" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="700" fill="#64748b">DIVERSIFICATION</text>
    <text x="218" y="360" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="800" fill="#059669">92 / 100</text>
    <text x="218" y="380" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="600" fill="#059669">Excellent Balance</text>

    <!-- Upcoming Payouts List -->
    <text x="28" y="420" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="800" fill="#18181b">Upcoming Dividends (12M)</text>

    <!-- Item 1 -->
    <rect x="24" y="432" width="352" height="60" rx="10" fill="#ffffff" stroke="#18181b" stroke-width="1.5" />
    <text x="40" y="456" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="800" fill="#18181b">ASML Holding N.V.</text>
    <text x="40" y="474" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#64748b">Oct 06, 2026 • 45 shares</text>
    <text x="356" y="456" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="800" fill="#059669" text-anchor="end">€68.20</text>
    <text x="356" y="474" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="600" fill="#059669" text-anchor="end">PAID</text>

    <!-- Item 2 -->
    <rect x="24" y="502" width="352" height="60" rx="10" fill="#ffffff" stroke="#18181b" stroke-width="1.5" />
    <text x="40" y="526" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="800" fill="#18181b">Microsoft Corp</text>
    <text x="40" y="544" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#64748b">Oct 10, 2026 • 125 shares (FX)</text>
    <text x="356" y="526" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="800" fill="#4f46e5" text-anchor="end">€96.25</text>
    <text x="356" y="544" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="600" fill="#4f46e5" text-anchor="end">FORECAST ⏱</text>

    <!-- Item 3 -->
    <rect x="24" y="572" width="352" height="60" rx="10" fill="#ffffff" stroke="#18181b" stroke-width="1.5" />
    <text x="40" y="596" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="800" fill="#18181b">Realty Income</text>
    <text x="40" y="614" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" fill="#64748b">Oct 15, 2026 • 180 shares (Monthly)</text>
    <text x="356" y="596" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="800" fill="#4f46e5" text-anchor="end">€42.60</text>
    <text x="356" y="614" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="600" fill="#4f46e5" text-anchor="end">FORECAST ⏱</text>

    <!-- Bottom Navigation Bar -->
    <rect x="12" y="648" width="376" height="80" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    
    <!-- Tab 1: Home -->
    <text x="50" y="680" font-size="16" text-anchor="middle">📊</text>
    <text x="50" y="696" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="700" fill="#2563eb" text-anchor="middle">Summary</text>
    
    <!-- Tab 2: Holdings -->
    <text x="125" y="680" font-size="16" text-anchor="middle">💼</text>
    <text x="125" y="696" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Holdings</text>
    
    <!-- Tab 3: Calendar -->
    <text x="200" y="680" font-size="16" text-anchor="middle">📅</text>
    <text x="200" y="696" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Calendar</text>

    <!-- Tab 4: Diversify -->
    <text x="275" y="680" font-size="16" text-anchor="middle">⚖️</text>
    <text x="275" y="696" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Diversify</text>

    <!-- Tab 5: Settings -->
    <text x="350" y="680" font-size="16" text-anchor="middle">⚙️</text>
    <text x="350" y="696" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Settings</text>
  </g>
</svg>
"""

(OUT_DIR / "dashboard-preview.svg").write_text(dashboard_svg)
(OUT_DIR / "calendar-preview.svg").write_text(calendar_svg)
(OUT_DIR / "security-lock-preview.svg").write_text(security_svg)
(OUT_DIR / "mobile-preview.svg").write_text(mobile_svg)

print("Generated 4 high-fidelity SVG previews in docs/assets/")
