import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label?: string;
    placeholder?: string;
    autoComplete?: string;
    required?: boolean;
    className?: string;
    labelClassName?: string;
    leadingIcon?: React.ReactNode;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
    id,
    value,
    onChange,
    label,
    placeholder,
    autoComplete,
    required,
    className,
    labelClassName,
    leadingIcon
}) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const defaultInputClass = "w-full bg-white/10 border border-white/30 rounded-lg p-3 pr-12 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white";

    return (
        <div>
            {label && <label htmlFor={id} className={labelClassName || "block text-sm font-medium text-blue-200 mb-1"}>{label}</label>}
            <div className="relative">
                {leadingIcon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        {leadingIcon}
                    </div>
                )}
                <input
                    id={id}
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    required={required}
                    className={className || defaultInputClass}
                    suppressHydrationWarning
                />
                <button
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-white"
                    aria-label={isPasswordVisible ? 'Sembunyikan password' : 'Tampilkan password'}
                    tabIndex={-1}
                >
                    {isPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            </div>
        </div>
    );
};

export default PasswordInput;