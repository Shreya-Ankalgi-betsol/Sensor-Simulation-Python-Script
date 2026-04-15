import React, { useState, useRef, useEffect } from 'react'

interface CheckboxOption {
  label: string
  value: string
}

interface CheckboxGroupProps {
  label: string
  options: CheckboxOption[]
  selected: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
  placeholderText?: string
}

export default function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
  disabled = false,
  placeholderText = 'All Options',
}: CheckboxGroupProps) {
  const [isOpen, setIsOpen] = useState(false)
  // Temporary UI state: updates on every checkbox click while dropdown is open
  const [tempSelected, setTempSelected] = useState<string[]>(selected)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // When dropdown opens, initialize temp state from committed state
  const handleOpenDropdown = () => {
    setTempSelected(selected)
    setIsOpen(true)
  }

  // When dropdown closes, commit temp state to parent
  const commitSelection = () => {
    onChange(tempSelected)
    setIsOpen(false)
  }

  const handleToggle = (value: string) => {
    // Update temporary local state only - no parent onChange yet
    setTempSelected(current =>
      current.includes(value)
        ? current.filter(s => s !== value)
        : [...current, value]
    )
    // Keep dropdown open when clicking checkbox
  }

  // Close dropdown and commit when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        commitSelection()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, tempSelected])

  const selectedCount = selected.length

  // Get display text for trigger button
  const getDisplayText = () => {
    if (selectedCount === 0) {
      return placeholderText
    } else if (selectedCount === 1) {
      // Show the selected value itself
      const selectedOption = options.find(o => o.value === selected[0])
      return selectedOption?.label || selected[0]
    } else {
      // Show count
      return `${selectedCount} selected`
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Label */}
      <label
        className="block mb-2"
        style={{
          fontSize: '0.71875rem',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600,
        }}
      >
        {label}
      </label>

      {/* Trigger Button */}
      <button
        onClick={() => handleOpenDropdown()}
        disabled={disabled}
        className="w-full"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          border: '1px solid #E2E8F0',
          borderRadius: '6px',
          fontSize: '1.00625rem',
          color: selectedCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
          background: '#FFFFFF',
          fontFamily: 'inherit',
          transition: 'all 0.2s duration',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = '#0284C7'
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = '#E2E8F0'
          }
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {getDisplayText()}
        </span>
        <span style={{ fontSize: '0.875rem', color: '#94A3B8', marginLeft: '8px', flexShrink: 0 }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 50,
            maxHeight: '300px',
            overflowY: 'auto',
            minWidth: '300px',
            maxWidth: 'calc(100vw - 24px)',
          }}
        >
          {/* Options */}
          {options.map((option) => (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                cursor: 'pointer',
                background: tempSelected.includes(option.value) ? '#E0F2FE' : 'transparent',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = tempSelected.includes(option.value) ? '#E0F2FE' : '#F0F9FF'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = tempSelected.includes(option.value) ? '#E0F2FE' : 'transparent'
              }}
            >
              <input
                type="checkbox"
                checked={tempSelected.includes(option.value)}
                onChange={() => handleToggle(option.value)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#0284C7',
                  flexShrink: 0,
                }}
              />
              <span style={{ whiteSpace: 'nowrap' }}>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
