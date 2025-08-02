// components/LoadingSpinner.tsx
export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#44C76F] border-4 border-[#004D40] transform rotate-3 flex items-center justify-center mx-auto mb-4 shadow-[6px_6px_0px_0px_#004D40]">
          <div className="w-8 h-8 border-4 border-[#004D40] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-[#004D40] font-bold text-lg">LOADING ROOMIO...</p>
        <p className="text-[#004D40] text-sm mt-2">Setting up your experience</p>
      </div>
    </div>
  );
} 