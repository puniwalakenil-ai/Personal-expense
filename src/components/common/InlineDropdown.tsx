import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X, Plus } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
}

export interface InlineDropdownProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  helperText?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export const InlineDropdown: React.FC<InlineDropdownProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  searchable,
  searchPlaceholder = 'Search options...',
  emptyText = 'No options found',
  disabled = false,
  className = '',
  helperText,
  actionButton,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Automatically enable search if there are more than 5 options, or if explicitly requested
  const isSearchEnabled = searchable !== undefined ? searchable : options.length > 5;

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(query)) ||
        (opt.badge && opt.badge.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  // Focus search input when expanding
  useEffect(() => {
    if (isOpen && isSearchEnabled) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen, isSearchEnabled]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-700 mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Main Trigger Field - Modern Inline Selector */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-expanded={isOpen}
        className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-100 border-slate-200'
            : isOpen
            ? 'border-purple-600 bg-white ring-2 ring-purple-500/10 shadow-xs'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-500">{selectedOption.icon}</span>
          )}
          {selectedOption?.color && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}

          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-900 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.subtitle && (
                <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                  {selectedOption.subtitle}
                </span>
              )}
              {selectedOption.badge && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-purple-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Inline Expanded Dropdown List (Expands naturally within the page layout - NOT modal, NOT popup) */}
      {isOpen && (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm space-y-1.5 transition-all">
          {/* Inline Search Bar */}
          {isSearchEnabled && (
            <div className="relative mb-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200/80 shadow-2xs'
                        : 'text-slate-800 hover:bg-slate-100/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0">
                      {opt.icon && (
                        <span
                          className={`shrink-0 ${
                            isSelected ? 'text-purple-600' : 'text-slate-500'
                          }`}
                        >
                          {opt.icon}
                        </span>
                      )}
                      {opt.color && (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                      )}
                      <div className="truncate">
                        <div className="truncate font-semibold">{opt.label}</div>
                        {opt.subtitle && (
                          <div className="text-[10px] text-slate-500 font-normal truncate mt-0.5">
                            {opt.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {opt.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-purple-200/80 text-purple-800 font-semibold'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-purple-600 stroke-[2.5]" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {actionButton && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  actionButton.onClick();
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/70 rounded-xl transition-colors cursor-pointer"
              >
                {actionButton.icon || <Plus className="w-3.5 h-3.5" />}
                <span>{actionButton.label}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
      )}
    </div>
  );
};
