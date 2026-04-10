export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom?: (value: any) => boolean;
  message: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule[];
}

export interface ValidationErrors {
  [key: string]: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateForm(data: Record<string, any>, rules: ValidationRules): ValidationErrors {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach((field) => {
    const value = data[field];
    const fieldRules = rules[field];

    for (const rule of fieldRules) {
      // Required validation
      if (rule.required && (!value || (typeof value === "string" && value.trim() === ""))) {
        errors[field] = rule.message;
        break;
      }

      // Skip other validations if field is empty and not required
      if (!value || (typeof value === "string" && value.trim() === "")) {
        continue;
      }

      // Min length validation
      if (rule.minLength && typeof value === "string" && value.length < rule.minLength) {
        errors[field] = rule.message;
        break;
      }

      // Max length validation
      if (rule.maxLength && typeof value === "string" && value.length > rule.maxLength) {
        errors[field] = rule.message;
        break;
      }

      // Pattern validation
      if (rule.pattern && typeof value === "string" && !rule.pattern.test(value)) {
        errors[field] = rule.message;
        break;
      }

      // Custom validation
      if (rule.custom && !rule.custom(value)) {
        errors[field] = rule.message;
        break;
      }
    }
  });

  return errors;
}

// Common validation patterns
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-()]+$/,
  url: /^https?:\/\/[^\s/$.?#].[^\s]*$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  creditCard: /^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/,
  ssn: /^\d{3}-?\d{2}-?\d{4}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphabetic: /^[a-zA-Z\s]+$/,
  numeric: /^\d+$/,
  currency: /^\$?\d+(\.\d{2})?$/,
};

// Common validation rules
export const commonRules = {
  required: (message = "This field is required"): ValidationRule => ({
    required: true,
    message,
  }),

  email: (message = "Please enter a valid email address"): ValidationRule => ({
    pattern: patterns.email,
    message,
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    minLength: length,
    message: message || `Must be at least ${length} characters long`,
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    maxLength: length,
    message: message || `Must be no more than ${length} characters long`,
  }),

  phone: (message = "Please enter a valid phone number"): ValidationRule => ({
    pattern: patterns.phone,
    message,
  }),

  url: (message = "Please enter a valid URL"): ValidationRule => ({
    pattern: patterns.url,
    message,
  }),

  zipCode: (message = "Please enter a valid ZIP code"): ValidationRule => ({
    pattern: patterns.zipCode,
    message,
  }),

  match: (
    otherField: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
    message = "Fields do not match"
  ): ValidationRule => ({
    custom: (value) => value === data[otherField],
    message,
  }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom: (validator: (value: any) => boolean, message: string): ValidationRule => ({
    custom: validator,
    message,
  }),
};

// Real-time validation hook
import { useCallback,useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFormValidation(initialData: Record<string, any>, rules: ValidationRules) {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (field: string, value: any) => {
      const fieldRules = rules[field];
      if (!fieldRules) return;

      const fieldErrors = validateForm({ [field]: value }, { [field]: fieldRules });

      setErrors((prev) => ({
        ...prev,
        [field]: fieldErrors[field] || "",
      }));
    },
    [rules]
  );

  const updateField = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (field: string, value: any) => {
      setData((prev) => ({ ...prev, [field]: value }));

      // Validate on change if field has been touched
      if (touched[field]) {
        validateField(field, value);
      }
    },
    [touched, validateField]
  );

  const touchField = useCallback(
    (field: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validateField(field, data[field]);
    },
    [data, validateField]
  );

  const validateAll = useCallback(() => {
    const allErrors = validateForm(data, rules);
    setErrors(allErrors);
    setTouched(Object.keys(rules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    return Object.keys(allErrors).length === 0;
  }, [data, rules]);

  const reset = useCallback(() => {
    setData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  return {
    data,
    errors,
    touched,
    updateField,
    touchField,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0 && Object.keys(touched).length > 0,
  };
}

// Form validation example usage:
/*
const MyForm = () => {
  const { data, errors, touched, updateField, touchField, validateAll } = useFormValidation(
    { email: '', password: '', confirmPassword: '' },
    {
      email: [commonRules.required(), commonRules.email()],
      password: [commonRules.required(), commonRules.minLength(8)],
      confirmPassword: [
        commonRules.required(),
        commonRules.match('password', data, 'Passwords must match')
      ]
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAll()) {
      // Submit form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={data.email}
        onChange={(e) => updateField('email', e.target.value)}
        onBlur={() => touchField('email')}
        className={errors.email && touched.email ? 'border-red-500' : ''}
      />
      {errors.email && touched.email && (
        <span className="text-red-500 text-sm">{errors.email}</span>
      )}
    </form>
  );
};
*/
