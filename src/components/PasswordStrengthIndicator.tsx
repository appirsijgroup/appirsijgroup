import React from 'react';
import { type PasswordValidationResult } from './passwordUtils';
import { CheckIcon, XIcon } from './Icons';

interface PasswordStrengthIndicatorProps {
    validationResult: PasswordValidationResult | null;
}

const Requirement: React.FC<{ isValid: boolean; text: string }> = ({ isValid, text }) => (
    <li className={`flex items-center gap-2 text-sm transition-colors ${isValid ? 'text-green-400' : 'text-gray-400'}`}>
        {isValid ? <CheckIcon className="w-4 h-4 shrink-0" /> : <XIcon className="w-4 h-4 shrink-0" />}
        <span>{text}</span>
    </li>
);

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ validationResult }) => {
    return (
        <ul className="p-4 bg-black/20 rounded-lg space-y-2 mt-2">
            <Requirement isValid={validationResult?.minLength ?? false} text="Minimal 8 karakter" />
            <Requirement isValid={validationResult?.hasUppercase ?? false} text="Mengandung huruf besar (A-Z)" />
            <Requirement isValid={validationResult?.hasLowercase ?? false} text="Mengandung huruf kecil (a-z)" />
            <Requirement isValid={validationResult?.hasNumber ?? false} text="Mengandung angka (0-9)" />
            <Requirement isValid={validationResult?.hasSymbol ?? false} text="Mengandung simbol (!@#$)" />
        </ul>
    );
};

export default PasswordStrengthIndicator;