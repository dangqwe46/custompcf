import * as React from "react";
import {
  IBaseProps,
  Dropdown,
  IDropdownOption
} from "@fluentui/react";

export interface IDatePickerControlProps extends IBaseProps<unknown> {
  disabled?: boolean;
  inputDate?: Date;
  lastXDate?: number;
  inputDateChanged: (newDate: Date | undefined) => void;
}

// Format date as dd/MM/yyyy
const formatSingaporeDate = (date: Date | null | undefined): string => 
  !date ? "" : `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;

// Helper to normalize date to midnight
const normalizeDateToMidnight = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

export const DatePickerBounded: React.FunctionComponent<IDatePickerControlProps> = (props) => {
  const [value, setValue] = React.useState<Date | undefined>(props.inputDate);
  const [customDates, setCustomDates] = React.useState<Date[]>(() => 
    props.inputDate ? [props.inputDate] : []);

  // Update value when props change
  React.useEffect(() => {
    if (props.inputDate !== undefined) {
      setValue(props.inputDate);
      
      // Add to custom dates if not present
      setCustomDates(prevDates => {
        const normalizedInputDate = normalizeDateToMidnight(props.inputDate!);
        return prevDates.some(date => 
          normalizeDateToMidnight(date).getTime() === normalizedInputDate.getTime()
        ) ? prevDates : [...prevDates, props.inputDate!];
      });
    } else {
      setValue(undefined);
    }
  }, [props.inputDate]);

  // Notify parent when value changes
  React.useEffect(() => {
    props.inputDateChanged(value);
  }, [value]);
  
  // Create dropdown options
  const getOptions = React.useCallback((): IDropdownOption[] => {
    const options: IDropdownOption[] = [];
    const today = new Date();
    const lastXDays: Date[] = [];
    
    // Add the recent days
    for (let i = 0; i < (props.lastXDate ?? 3); i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const normalizedDate = normalizeDateToMidnight(date);
      lastXDays.push(normalizedDate);
      
      options.push({
        key: normalizedDate.toDateString(),
        text: formatSingaporeDate(normalizedDate),
        data: normalizedDate
      });
    }
    
    // Add custom dates not in recent days
    for (const customDate of customDates) {
      const normalizedCustomDate = normalizeDateToMidnight(customDate);
      
      // Skip if already in the options
      if (lastXDays.some(date => date.getTime() === normalizedCustomDate.getTime())) {
        continue;
      }
      
      options.push({
        key: normalizedCustomDate.toDateString(),
        text: formatSingaporeDate(normalizedCustomDate),
        data: normalizedCustomDate
      });
    }
    
    // Add current value if not already in options
    if (value) {
      const normalizedValue = normalizeDateToMidnight(value);
      
      if (!options.some(option => (option.data as Date).getTime() === normalizedValue.getTime())) {
        options.push({
          key: normalizedValue.toDateString(),
          text: formatSingaporeDate(normalizedValue),
          data: normalizedValue
        });
      }
    }
  
    return options;
  }, [customDates, value, props.lastXDate]);
  
  // Handle dropdown selection change
  const onChange = React.useCallback((event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option?.data) {
      const selectedDate = option.data as Date;
      setValue(selectedDate);
      
      // Add to custom dates if not present
      setCustomDates(prevDates => {
        const normalizedSelected = normalizeDateToMidnight(selectedDate);
        return prevDates.some(date => 
          normalizeDateToMidnight(date).getTime() === normalizedSelected.getTime()
        ) ? prevDates : [...prevDates, selectedDate];
      });
    }
  }, []);

  // Get selected key for dropdown
  const getSelectedKey = React.useCallback((): string | undefined => {
    if (!value) return undefined;
    return normalizeDateToMidnight(value).toDateString();
  }, [value]);
  
  return (
    <div style={{ width: "100%" }}>
      <Dropdown
        placeholder="Select a date"
        options={getOptions()}
        styles={{ dropdown: { minWidth: 200} }}
        onChange={onChange}
        selectedKey={getSelectedKey()}
        disabled={props.disabled}
      />
    </div>
  );
};