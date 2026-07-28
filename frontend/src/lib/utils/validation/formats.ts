// Type-safe version of formatting functions

export interface FormatInputOptions {
  formatNumbers?: boolean;
  formatSymbols?: boolean;
  formatSpaces?: boolean;
  capitalize?: boolean;
  lowerCase?: boolean;
  englishOnly?: boolean;
  usernameFormat?: boolean;
  type?: 'text' | 'number' | 'tel' | 'email' | 'password' | 'search' | 'url';
  value: string;
  min?: number;
  max?: number;
  maxLength?: number;
  minLength?: number;
}

export const cutNumbers = (str: string): string => {
  // Functions for formatting input values
  return str.replace(/[0-9]/g, '');
};

export const cutSymbols = (str: string): string => {
  return str.replace(/[^\w\s\u0370-\u03FF]/g, '');
};

export const cutSpaces = (str: string): string => {
  return str.replace(/\s/g, '');
};

export const capitalizeFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const restrictCapitalLetters = (str: string): string => {
  return str.toLowerCase();
};

export const keepOnlyNumbers = (str: string): string => {
  return str.toString().replace(/[^\d]/g, '');
};

// Allow English letters, numbers, hyphens, and underscores; auto-lowercase
export const formatUsername = (str: string): string => {
  return str.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
};

// Generate a username from the local part of an email (before @)
// e.g. "john.doe@gmail.com" → "johndoe", "Jane_Smith-work@co.uk" → "jane_smith-work"
export const generateUsernameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] || email;
  return localPart.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
};

export const formatDisplayName = (str: string): string => {
  // Only capitalize first letter, no other formatting
  return capitalizeFirstLetter(str);
};

export const formatInput = (options: FormatInputOptions): string => {
  const {
    formatNumbers,
    formatSymbols,
    formatSpaces,
    capitalize,
    lowerCase,
    englishOnly,
    usernameFormat,
    type,
    value,
    min,
    max,
    maxLength,
    minLength,
  } = options;

  let formattedValue: string = value;

  if (type === 'number' || type === 'tel') {
    formattedValue = keepOnlyNumbers(formattedValue);
    // Enforce maxLength for number and tel inputs
    if (maxLength && formattedValue.length > maxLength) {
      formattedValue = formattedValue.substring(0, maxLength);
    }
    // For number inputs, keep as string if empty, otherwise parse
    // This allows the InputB component to handle empty state correctly on change/blur
    if (type === 'number' && formattedValue !== '') {
      // We don't parseFloat here anymore, InputB's onBlur will handle final numeric conversion/validation
      // formattedValue = parseFloat(formattedValue); // Removed parseFloat here
    } else if (type === 'number' && formattedValue === '') {
      // Explicitly return empty string if formatting resulted in empty
      return '';
    }
  }
  
  // Apply username format first if specified
  if (usernameFormat) {
    formattedValue = formatUsername(formattedValue);
  }
  // Apply English-only filter if specified (maintaining backward compatibility)
  else if (englishOnly) {
    formattedValue = formatUsername(formattedValue);
  }
  
  // Apply number formatting only if formatNumbers is true
  if (formatNumbers) {
    formattedValue = cutNumbers(formattedValue);
  }
  
  // Apply symbol formatting only if formatSymbols is true
  if (formatSymbols) {
    formattedValue = cutSymbols(formattedValue);
  }
  
  // Apply space formatting only if formatSpaces is true
  if (formatSpaces) {
    formattedValue = cutSpaces(formattedValue);
  }
  
  // Apply capitalization only if capitalize is true
  if (capitalize) {
    formattedValue = capitalizeFirstLetter(formattedValue);
  }
  
  // Apply lowercase restriction only if lowerCase is true
  if (lowerCase) {
    formattedValue = restrictCapitalLetters(formattedValue);
  }

  return formattedValue;
};