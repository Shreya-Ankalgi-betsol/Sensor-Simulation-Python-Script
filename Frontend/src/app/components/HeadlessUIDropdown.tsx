import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/16/solid'

interface DropdownOption {
  value: string
  label: string
}

interface HeadlessUIDropdownProps {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  label?: string
  placeholder?: string
  compact?: boolean
  disabled?: boolean
}

export default function HeadlessUIDropdown({
  value,
  onChange,
  options,
  label,
  placeholder,
  compact = false,
  disabled = false,
}: HeadlessUIDropdownProps) {
  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder || 'Select...'

  return (
    <div>
      {label && (
        <label
          className="block mb-2"
          style={{
            fontSize: "0.71875rem",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
          }}
        >
          {label}
        </label>
      )}
      <Menu>
        <MenuButton
          disabled={disabled}
          className="inline-flex items-center justify-between gap-2 rounded-md appearance-none cursor-pointer transition-all duration-200"
          style={{
            background: disabled ? '#F1F5F9' : '#FFFFFF',
            border: disabled ? '1px solid var(--border-color)' : '1px solid #E2E8F0',
            borderRadius: "6px",
            color: disabled ? '#94A3B8' : 'var(--text-primary)',
            fontSize: compact ? "0.72rem" : "1.00625rem",
            padding: compact ? '3px 8px' : '8px 12px',
            fontFamily: "var(--font-mono)",
            width: "100%",
            minWidth: 0,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: 1,
            WebkitTextFillColor: disabled ? '#94A3B8' : undefined,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{selectedLabel}</span>
          <ChevronDownIcon className={`${compact ? 'size-3' : 'size-4'} flex-shrink-0`} style={{ fill: disabled ? '#94A3B8' : '#9CA3AF' }} />
        </MenuButton>

        {!disabled && (
        <MenuItems
          transition
          anchor="bottom start"
          className="origin-top rounded-lg border transition duration-100 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            marginTop: '4px',
            minWidth: compact ? '104px' : '300px',
            maxWidth: 'calc(100vw - 24px)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            padding: '4px',
            maxHeight: '300px',
            overflowY: 'auto',
            position: 'fixed',
          }}
        >
          {options.map((option) => (
            <MenuItem key={option.value}>
              <button
                onClick={() => onChange(option.value)}
                className="flex w-full items-center gap-2 rounded text-left transition-colors data-focus:bg-blue-50"
                style={{
                  color: value === option.value ? '#0284C7' : 'var(--text-primary)',
                  fontWeight: value === option.value ? 600 : 400,
                  fontSize: compact ? '0.78rem' : "1.00625rem",
                  padding: compact ? '4px 8px' : '6px 12px',
                  fontFamily: "var(--font-mono)",
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                {value === option.value && (
                  <span style={{ marginRight: '4px' }}>✓</span>
                )}
                {option.label}
              </button>
            </MenuItem>
          ))}
        </MenuItems>
        )}
      </Menu>
    </div>
  )
}
