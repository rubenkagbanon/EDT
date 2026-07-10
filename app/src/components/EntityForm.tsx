import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type FieldDef =
  | { name: string; label: string; type: 'text'; required?: boolean; placeholder?: string }
  | { name: string; label: string; type: 'number'; required?: boolean; min?: number; step?: number }
  | { name: string; label: string; type: 'time'; required?: boolean }
  | {
      name: string
      label: string
      type: 'select'
      required?: boolean
      options: { value: string; label: string }[]
    }

type Values = Record<string, string | number | null | undefined>

export function EntityForm({
  fields,
  values,
  onChange,
}: {
  fields: FieldDef[]
  values: Values
  onChange: (name: string, value: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.type === 'select' ? (
            <Select
              value={values[field.name] != null ? String(values[field.name]) : undefined}
              onValueChange={(v) => onChange(field.name, v)}
            >
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={field.name}
              type={field.type}
              required={field.required}
              min={field.type === 'number' ? field.min : undefined}
              step={field.type === 'number' ? field.step : undefined}
              placeholder={field.type === 'text' ? field.placeholder : undefined}
              value={values[field.name] ?? ''}
              onChange={(e) => onChange(field.name, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
