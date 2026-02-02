
import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="w-full text-center py-4 mt-8 border-t border-white/10 text-gray-400">
        <p className="text-sm font-medium">&copy; 2026 APPI RSIJ GROUP</p>
        <p className="text-xs text-gray-500 mt-1">Developed by Edi Heryanto</p>
    </footer>
  );
};

export default Footer;