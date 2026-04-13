import React, { useState } from 'react'

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
}

export default function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
  disabled = false,
}: CheckboxGroupProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(s => s !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([])
    } else {
      onChange(options.map(o => o.value))
    }
  }

  const selectedCount = selected.length
  const allSelected = selectedCount === options.length
  const someSelected = selectedCount > 0 && !allSelected

  return (
    <div className="relative">
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
        onClick={() => setIsOpen(!isOpen)}
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
          color: 'var(--text-primary)',
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
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedCount > 0 ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: '#0284C7',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {selectedCount}
            </span>
          ) : (
            <span
              style={{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                border: '2px solid #E2E8F0',
              }}
            />
          )}
          <span>{selectedCount > 0 ? `${selectedCount} selected` : 'Select...'}</span>
        </span>
        <span style={{ fontSize: '0.875rem', color: '#94A3B8' }}>
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
            right: 0,
            marginTop: '4px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 50,
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {/* Select All Option */}
          {options.length > 1 && (
            <>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderBottom: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  background: someSelected ? '#F0F9FF' : undefined,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F0F9FF'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = someSelected ? '#F0F9FF' : 'transparent'
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  indeterminate={someSelected as any}
                  onChange={handleSelectAll}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: '#0284C7',
                  }}
                />
                <span>Select All</span>
              </label>
            </>
          )}

          {/* Options */}
          {options.map((option) => (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                cursor: 'pointer',
                background: selected.includes(option.value) ? '#E0F2FE' : 'transparent',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F0F9FF'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selected.includes(option.value) ? '#E0F2FE' : 'transparent'
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => handleToggle(option.value)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: '#0284C7',
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
