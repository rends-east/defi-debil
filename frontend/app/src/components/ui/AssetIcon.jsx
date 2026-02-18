import React, { useState } from 'react';

const ASSET_URLS = {
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
};

// Fallback colored badge if the image fails to load
const ASSET_FALLBACK = {
  BNB:  { bg: 'bg-yellow-400', text: 'text-white' },
  USDC: { bg: 'bg-blue-500',   text: 'text-white' },
};

const SIZE_CLASS = {
  xs:  'w-3.5 h-3.5',
  sm:  'w-4   h-4',
  md:  'w-5   h-5',
  lg:  'w-6   h-6',
  xl:  'w-8   h-8',
};

export const AssetIcon = ({ asset, size = 'sm', className = '' }) => {
  const [errored, setErrored] = useState(false);
  const sz = SIZE_CLASS[size] ?? SIZE_CLASS.sm;
  const url = ASSET_URLS[asset];
  const fb  = ASSET_FALLBACK[asset];

  if (!url || errored) {
    return (
      <span
        className={`${sz} ${fb?.bg ?? 'bg-gray-400'} ${fb?.text ?? 'text-white'} rounded-full flex items-center justify-center font-bold shrink-0 ${className}`}
        style={{ fontSize: '0.45rem', lineHeight: 1 }}
      >
        {asset?.[0] ?? '?'}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={asset}
      className={`${sz} rounded-full object-contain shrink-0 ${className}`}
      onError={() => setErrored(true)}
    />
  );
};
