import * as React from "react"
import { InputWithSuffix } from "./input-with-suffix"

export interface CurrencyProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  /** Currency symbol or text to display */
  currency?: string
  /** Position of the currency symbol */
  position?: 'left' | 'right'
  /** Callback when value changes - returns the numeric value */
  onValueChange?: (value: number | null) => void
  /** Current numeric value */
  value?: number | null
  /** Allow decimal places */
  allowDecimals?: boolean
  /** Maximum number of decimal places (default: 2) */
  decimalPlaces?: number
  /** Minimum value allowed */
  min?: number
  /** Maximum value allowed */
  max?: number
}

const Currency = React.forwardRef<HTMLInputElement, CurrencyProps>(
  ({ 
    className, 
    currency = "€", 
    position = "right", 
    onValueChange,
    value,
    allowDecimals = true,
    decimalPlaces = 2,
    min,
    max,
    ...props 
  }, ref) => {
    // Internal state for the display value
    const [displayValue, setDisplayValue] = React.useState<string>(() => {
      if (value === null || value === undefined) return ''
      return allowDecimals ? value.toFixed(decimalPlaces) : value.toString()
    })

    // Update display value when external value changes
    React.useEffect(() => {
      if (value === null || value === undefined) {
        setDisplayValue('')
      } else {
        setDisplayValue(allowDecimals ? value.toFixed(decimalPlaces) : value.toString())
      }
    }, [value, allowDecimals, decimalPlaces])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value

      // Allow empty string - send 0 instead of null for validation
      if (inputValue === '') {
        setDisplayValue('')
        onValueChange?.(0)
        return
      }

      // Create regex based on decimal settings
      const decimalRegex = allowDecimals
        ? new RegExp(`^\\d*\\.?\\d{0,${decimalPlaces}}$`)
        : /^\d*$/

      // Validate input format
      if (decimalRegex.test(inputValue)) {
        setDisplayValue(inputValue)

        // Convert to number
        const numericValue = allowDecimals ? parseFloat(inputValue) : parseInt(inputValue, 10)

        // Check if it's a valid number and send raw value (no constraints while typing)
        if (!isNaN(numericValue)) {
          onValueChange?.(numericValue)
        }
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Apply min/max constraints and format the display value on blur
      if (displayValue && !isNaN(parseFloat(displayValue))) {
        let numValue = parseFloat(displayValue)

        // Apply min/max constraints
        if (min !== undefined && numValue < min) {
          numValue = min
        }
        if (max !== undefined && numValue > max) {
          numValue = max
        }

        // Format and update display
        if (allowDecimals) {
          setDisplayValue(numValue.toFixed(decimalPlaces))
        } else {
          setDisplayValue(numValue.toString())
        }

        // Send constrained value
        onValueChange?.(numValue)
      }

      // Call original onBlur if provided
      props.onBlur?.(e)
    }

    return (
      <InputWithSuffix
        type="text"
        inputMode="decimal"
        suffix={currency}
        position={position}
        className={className}
        ref={ref}
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        {...props}
      />
    )
  }
)

Currency.displayName = "Currency"

export { Currency }