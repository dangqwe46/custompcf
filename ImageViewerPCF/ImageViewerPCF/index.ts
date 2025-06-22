import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import {
  ImageViewerWrapper,
  ImageViewerWrapperProps,
} from "./src/components/imageViewerWrapper";
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { generateGuid } from "./src/helpers/common";

export class ImageViewerPCF
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private container: HTMLDivElement;
  private imageViewerWrapperProps: ImageViewerWrapperProps;
  private defectTempId: string;
  private isNewGuid: boolean = false; // Track if we generated a new GUID
  private notifyOutputChanged: () => void;
  private rootElement: Root | null = null;
  private debugMode: boolean = false;

  /**
   * Empty constructor.
   */
  constructor() {}

  /**
   * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
   * Data-set values are not initialized here, use updateView.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
   * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
   * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
   * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
   */
  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    // Add control initialization code
    this.container = container;
    this.debugMode = context.parameters.debugMode.raw;
    this.notifyOutputChanged = notifyOutputChanged;
    
    // Initialize with existing value or generate a new ID if creating a new record
    if (context.parameters.defectTempId.raw) {
      // Use existing value if available
      this.defectTempId = context.parameters.defectTempId.raw;
      console.log(`[ImageViewerPCF] Using existing defectTempId: ${this.defectTempId}`);
    } else {
      // Generate a new ID for a new record
      this.defectTempId = generateGuid();
      this.isNewGuid = true;
      console.log(`[ImageViewerPCF] Generated new defectTempId: ${this.defectTempId}`);
      
      // Notify framework about the new value
      this.notifyOutputChanged();
    }
    
    // Create props for the React component
    this.initializeProps(context);
  }

  /**
   * Initialize the React component props
   * @param context The PCF context
   */
  private initializeProps(context: ComponentFramework.Context<IInputs>): void {
    this.imageViewerWrapperProps = {
      pcfContext: context,
      defectTempId: this.defectTempId,
      debugMode: this.debugMode,
      updateOutput: (value: string) => {
        if (value && value !== this.defectTempId) {
          this.defectTempId = value;
          this.notifyOutputChanged();
        }
      }
    };
  }

  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    // Check if defectTempId has been loaded after initialization
    if (this.isNewGuid && context.parameters.defectTempId.raw) {
      // We previously generated a GUID, but now we have a real value
      const loadedValue = context.parameters.defectTempId.raw;
      
      // Only update if the loaded value is different and not just our generated value
      // that got saved back to the field
      if (loadedValue !== this.defectTempId) {
        console.log(`[ImageViewerPCF] Updating from generated defectTempId to loaded value: ${loadedValue}`);
        this.defectTempId = loadedValue;
        this.isNewGuid = false;
      }
    }

    // Update context in props
    this.imageViewerWrapperProps.pcfContext = context;
    this.imageViewerWrapperProps.defectTempId = this.defectTempId;

    this.renderReactComponent();
  }

  /**
   * Render the React component with current props
   */
  private renderReactComponent(): void {
    try {
      // Only create root once to avoid re-renders
      if (!this.rootElement) {
        this.rootElement = createRoot(this.container);
      }

      this.rootElement.render(
        React.createElement(ImageViewerWrapper, this.imageViewerWrapperProps)
      );
    } catch (error) {
      console.error("[ImageViewerPCF] Error rendering component:", error);
    }
  }

  /**
   * It is called by the framework prior to a control receiving new data.
   * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
   */
  public getOutputs(): IOutputs {
    return {
      defectTempId: this.defectTempId,
    };
  }

  /**
   * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
   * i.e. cancelling any pending remote calls, removing listeners, etc.
   */
  public destroy(): void {
    // Unmount React component
    if (this.rootElement) {
      this.rootElement.unmount();
    }
  }
}
