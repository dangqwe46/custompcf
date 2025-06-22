import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { DatePickerBounded, IDatePickerControlProps } from "./DatePicker";
import { createRoot, Root } from "react-dom/client";
import * as React from "react";

export class DatePickerControl
  implements ComponentFramework.ReactControl<IInputs, IOutputs>
{
  private notifyOutputChanged: () => void;
  private root: Root;
  private datePickerProps: IDatePickerControlProps = {
    disabled: false,
    lastXDate: 3,
    inputDate: undefined,
    inputDateChanged: this.inputDateChanged.bind(this),
  };

  // Handle date changes and notify framework
  private inputDateChanged(newValue: Date | undefined): void {
    if (this.datePickerProps.inputDate !== newValue) {
      this.datePickerProps.inputDate = newValue;
      this.notifyOutputChanged();
    }
  }

  /**
   * Initialize the control
   */
  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void
  ): void {
    this.notifyOutputChanged = notifyOutputChanged;
    
    // Set LastXDate from parameters if provided
    if (context.parameters.LastXDate?.raw !== null) {
      this.datePickerProps.lastXDate = Number(context.parameters.LastXDate.raw);
    }

    // Set initial date if provided
    this.datePickerProps.inputDate = context.parameters.DateField.raw ?? undefined;
  }

  /**
   * Updates the control with context changes
   */
  public updateView(
    context: ComponentFramework.Context<IInputs>
  ): React.ReactElement {
    // Update disabled state
    this.datePickerProps.disabled = context.mode.isControlDisabled;
    
    return React.createElement(DatePickerBounded, this.datePickerProps);
  }

  /**
   * Get output values for the framework
   */
  public getOutputs(): IOutputs {
    if (!this.datePickerProps.inputDate) {
      return { DateField: undefined };
    }
    
    // Create a date at midnight in local time
    const localDate = this.datePickerProps.inputDate;
    const utcDate = new Date(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate()
    );
    
    return { DateField: utcDate };
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.datePickerProps.inputDate = undefined;
  }
}
