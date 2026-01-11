
import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="w-full text-center py-4 mt-8 border-t border-white/10 text-sm text-gray-400">
        <p>&copy; {currentYear} RS Islam Jakarta Sukapura | Dikembangkan oleh Edi Heryanto</p>
    </footer>
  );
};

export default Footer;