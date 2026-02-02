import React, { useState, useMemo, useRef, useEffect } from 'react';
import { type Employee } from '../types';
import { SearchIcon, XIcon } from './Icons';

interface EmployeeSearchableInputProps {
    allUsers: Employee[];
    value: string | undefined;
    onChange: (id: string | undefined) => void;
    placeholder?: string;
}

const EmployeeSearchableInput: React.FC<EmployeeSearchableInputProps> = ({ allUsers, value, onChange, placeholder }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedEmployeeName = useMemo(() => {
        if (!value) return '';
        return allUsers.find(u => u.id === value)?.name || '';
    }, [value, allUsers]);

    useEffect(() => {
        setSearchQuery(selectedEmployeeName);
    }, [selectedEmployeeName]);

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return allUsers;
        const lowerQuery = searchQuery.toLowerCase();
        return allUsers.filter(user => 
            user.name.toLowerCase().includes(lowerQuery) || 
            user.id.includes(lowerQuery)
        );
    }, [searchQuery, allUsers]);

    const handleSelect = (id: string | undefined) => {
        onChange(id);
        const newName = id ? allUsers.find(u => u.id === id)?.name || '' : '';
        setSearchQuery(newName);
        setIsDropdownOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
                setSearchQuery(selectedEmployeeName);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [selectedEmployeeName]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (!isDropdownOpen) setIsDropdownOpen(true);
                        if (e.target.value === '') {
                             onChange(undefined);
                        }
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-white/10 border border-white/30 rounded-lg py-2 pl-10 pr-8 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                    autoComplete="off"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => handleSelect(undefined)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
                        title="Hapus"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
            {isDropdownOpen && (
                <div className="absolute z-50 w-full min-w-[250px] mt-1 bg-gray-800 border border-white/30 rounded-lg shadow-xl max-h-60 overflow-auto">
                    <ul className="py-1">
                        {filteredUsers.length > 0 ? filteredUsers.map(user => (
                            <li
                                key={user.id}
                                onClick={() => handleSelect(user.id)}
                                className="px-4 py-2.5 text-sm text-white hover:bg-teal-600 cursor-pointer transition-colors"
                            >
                                <p className="font-medium truncate">{user.name}</p>
                                <p className="text-xs text-gray-400 truncate">{user.id}</p>
                            </li>
                        )) : (
                            <li className="px-4 py-2 text-sm text-gray-400">Tidak ditemukan</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default EmployeeSearchableInput;