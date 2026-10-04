import React, { useState } from 'react';

interface StockLogoProps {
  ticker: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Generate consistent background color based on ticker string
const getAvatarColor = (str: string) => {
  const colors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-sky-100 text-sky-700 border-sky-200',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const StockLogo: React.FC<StockLogoProps> = ({
  ticker,
  name,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const [tryFallback, setTryFallback] = useState(false);

  // Normalize ticker: remove suffixes like _US_EQ, _NL_EQ, or trailing lowercase market letters
  const cleanTicker = (ticker || '')
    .split('_')[0]
    .replace(/[a-z]$/, '')
    .toUpperCase();

  const primaryUrl = `https://trading212equities.s3.eu-central-1.amazonaws.com/${cleanTicker}.png`;
  const secondaryUrl = `https://trading212equities.s3.eu-central-1.amazonaws.com/${cleanTicker}_US_EQ.png`;

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs rounded-lg',
    md: 'w-9 h-9 text-xs rounded-xl',
    lg: 'w-11 h-11 text-sm rounded-xl',
  };

  const handleImageError = () => {
    if (!tryFallback) {
      setTryFallback(true);
    } else {
      setImgError(true);
    }
  };

  const initials = (cleanTicker || ticker || 'STK').slice(0, 3);
  const colorClass = getAvatarColor(cleanTicker || ticker);

  if (imgError || !ticker) {
    return (
      <div
        className={`flex items-center justify-center font-semibold tracking-wider border shadow-sm select-none transition-all duration-200 ${sizeClasses[size]} ${colorClass} ${className}`}
        title={name || ticker}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center bg-white border border-slate-200/80 shadow-sm overflow-hidden p-0.5 select-none transition-all duration-200 ${sizeClasses[size]} ${className}`}
      title={name || ticker}
    >
      <img
        src={tryFallback ? secondaryUrl : primaryUrl}
        alt={ticker}
        className="w-full h-full object-contain rounded-lg transition-opacity duration-200"
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  );
};
