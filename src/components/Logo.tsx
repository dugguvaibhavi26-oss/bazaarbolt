"use client";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Logo = ({ className = "", size = "md" }: LogoProps) => {
  const sizeMap = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-32 h-32",
    xl: "w-48 h-48",
  };

  return (
    <div className={`relative flex items-center justify-center ${sizeMap[size]} ${className} select-none`}>
      <img 
        src="/logo.png" 
        alt="BazaarBolt Logo" 
        className="w-full h-full object-cover scale-[1.2] transition-transform duration-500 group-hover:scale-[1.3]"
        onError={(e) => {
          // Fallback to stylized SVG if image is not yet uploaded to public/logo.png
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) parent.setAttribute('data-fallback', 'true');
        }}
      />
      <div className="hidden data-[fallback=true]:block absolute inset-0">
        <svg viewBox="0 0 500 500" fill="none" className="w-full h-full">
           <text x="50" y="250" fill="#22C55E" style={{ font: 'bold 120px sans-serif' }}>BB</text>
        </svg>
      </div>
    </div>
  );
};
