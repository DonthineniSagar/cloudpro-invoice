'use client';

interface MyBizLogoProps {
  size?: 'sm' | 'md' | 'lg';
  dark?: boolean;
}

const sizes = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-5xl',
};

export default function MyBizLogo({ size = 'md', dark = false }: MyBizLogoProps) {
  return (
    <span className={`${sizes[size]} tracking-tight`} style={{ fontFamily: "'Lobster', cursive" }}>
      <span className={dark ? 'text-purple-400' : 'text-indigo-600'}>My</span>
      <span className={dark ? 'text-white' : 'text-gray-900'}>Biz</span>
    </span>
  );
}
