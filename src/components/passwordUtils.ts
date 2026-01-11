export interface PasswordValidationResult {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
}

export const validatePassword = (password: string): PasswordValidationResult => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return {
        minLength,
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasSymbol,
    };
};

export const isPasswordValid = (result: PasswordValidationResult): boolean => {
    return Object.values(result).every(Boolean);
};
