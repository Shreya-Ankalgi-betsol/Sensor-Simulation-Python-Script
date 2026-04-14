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
}

export default function HeadlessUIDropdown({
  value,
  onChange,
  options,
  label,
  placeholder,
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
          className="inline-flex items-center justify-between gap-2 rounded-md px-3 py-2 appearance-none cursor-pointer transition-all duration-200"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            color: "var(--text-primary)",
            fontSize: "1.00625rem",
            fontFamily: "var(--font-mono)",
            width: "100%",
            minWidth: 0,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{selectedLabel}</span>
          <ChevronDownIcon className="size-4 fill-gray-400 flex-shrink-0" />
        </MenuButton>

        <MenuItems
          transition
          anchor="bottom start"
          className="origin-top rounded-lg border transition duration-100 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            marginTop: '4px',
            minWidth: '300px',
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
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left transition-colors data-focus:bg-blue-50"
                style={{
                  color: value === option.value ? '#0284C7' : 'var(--text-primary)',
                  fontWeight: value === option.value ? 600 : 400,
                  fontSize: "1.00625rem",
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
      </Menu>
    </div>
  )
}
