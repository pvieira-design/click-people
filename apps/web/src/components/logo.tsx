interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className, size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 125 122"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M55.2608 104.203C51.2802 108.203 51.2802 114.688 55.2608 118.688C59.2422 122.688 65.6966 122.688 69.6777 118.688C73.6586 114.688 73.6586 108.203 69.6777 104.203L62.4695 96.9598L55.2608 104.203Z"
        fill="currentColor"
      />
      <path
        d="M54.6451 0H70.2967L70.297 64.1354L111.189 23.0315L122.256 34.152L85.9488 70.6496H124.942V86.3764H0V70.6496H38.993L2.68503 34.152L13.7525 23.0315L54.6451 64.1354V0Z"
        fill="currentColor"
      />
    </svg>
  );
}
