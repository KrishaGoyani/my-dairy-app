import { Search } from 'lucide-react'

export default function SearchInput({
  value,
  onChange,
  placeholder,
  className = '',
  inputClassName = '',
  onSubmit,
  ...props
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSubmit) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <Search
        size={18}
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`input-field !pl-11 ${inputClassName}`}
        {...props}
      />
    </div>
  )
}
