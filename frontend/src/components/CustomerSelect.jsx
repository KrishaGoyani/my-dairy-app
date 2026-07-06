import Select from './Select'
import { customerDisplay, t } from '../utils/labels'

export default function CustomerSelect({
  customers = [],
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = t('Select customer', 'ગ્રાહક પસંદ કરો'),
}) {
  const options = customers.map((c) => ({
    value: c.id,
    label: customerDisplay(c),
    searchText: `${c.name || ''} ${c.phone || ''}`.trim(),
  }))

  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      searchable
      searchPlaceholder={t('Search by name or phone', 'નામ અથવા ફોન શોધો')}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      emptyMessage={t('No customers found', 'કોઈ ગ્રાહક મળ્યો નહીં')}
    />
  )
}
