"use client";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Logo = ({ className = "", size = "md" }: LogoProps) => {
  const sizeMap = {
    sm: "h-8 w-auto",
    md: "h-12 w-auto",
    lg: "h-20 w-auto",
    xl: "h-32 w-auto",
  };

  return (
    <div className={`relative flex items-center justify-center ${sizeMap[size]} ${className} select-none`}>
      <img 
        src="/logo.png" 
        alt="BazaarBolt Logo" 
        className="h-full w-auto object-contain transition-transform duration-500 group-hover:scale-105"
        onError={(e) => {
          // Fallback to stylized SVG if image is not yet uploaded to public/logo.png
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) parent.setAttribute('data-fallback', 'true');
        }}
      />
      <div className="hidden data-[fallback=true]:block h-full w-auto">
        <svg viewBox="0 0 400 100" fill="none" className="h-full w-auto">
           <text x="0" y="70" fill="#22C55E" style={{ font: 'bold 80px sans-serif' }}>BAZAAR</text>
           <text x="310" y="70" fill="#4B5563" style={{ font: '400 80px sans-serif' }}>bolt</text>
        </svg>
      </div>
    </div>
  );
};
