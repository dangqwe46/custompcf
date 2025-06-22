

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import ReactAttachmentVideoControl from "./ReactAttachmentVideoControl";

/**
 * EntityReference class
 * @param entityId - The id of the entity
 * @param entityTypeName - The type name of the entity
 * @param entityRecordName - The record name of the entity
 */
class EntityReference {
  entityId: string | null;
  entityRecordName: string | null;
  entityTypeName: string;
  constructor(
    entityTypeName: string,
    entityId: string | null,
    entityRecordName: string | null
  ) {
    this.entityId = entityId;
    this.entityTypeName = entityTypeName;
    this.entityRecordName = entityRecordName;
  }
}

/**
 * AttachedFile class
 * @param annotationId - The id of the annotation
 * @param fileName - The name of the file
 * @param mimeType - The mime type of the file
 * @param fileContent - The content of the file
 * @param fileSize - The size of the file
 */
class AttachedFile implements ComponentFramework.FileObject {
  annotationId: string;
  fileContent: string;
  fileSize: number;
  fileName: string;
  mimeType: string;
  constructor(
    annotationId: string,
    fileName: string,
    mimeType: string,
    fileContent: string,
    fileSize: number
  ) {
    this.annotationId = annotationId;
    this.fileName = fileName;
    this.mimeType = mimeType;
    this.fileContent = fileContent;
    this.fileSize = fileSize;
  }
}
/**
 * AttachmentVideoControl class
 * @param context - The context of the control
 * @param notifyOutputChanged - A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
 * @param state - A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
 */
export class AttachmentVideoControl
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private entityReference: EntityReference;
  private _context: ComponentFramework.Context<IInputs>;
  private _container: HTMLDivElement;
  private _notifyOutputChanged: () => void;
  private defectTempId: string;
  private debugMode: boolean;

  private _root: Root | null = null;

  /**
   * Empty constructor.
   */
  constructor() {
    // Empty
  }

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
    this._context = context;
    this._container = container;

    this._notifyOutputChanged = notifyOutputChanged;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.entityReference = (context as any).mode.contextInfo as EntityReference;
    // Initialize with existing value or generate a new ID if creating a new record
    if (context.parameters.defectTempId.raw) {
      // Use existing value if available
      this.defectTempId = context.parameters.defectTempId.raw;
      console.log(
        `[AttachmentVideoControl] Using existing defectTempId: ${this.defectTempId}`
      );
    } else {
      // Generate a new ID for a new record
      this.defectTempId = this.generateGuid();
      console.log(
        `[AttachmentVideoControl] Generated new defectTempId: ${this.defectTempId}`
      );

      // Notify framework about the new value
      this._notifyOutputChanged();
    }
    // Get debugMode from input properties
    this.debugMode = context.parameters.debugMode?.raw || false;

    // Create React root and render the component
    this._root = createRoot(this._container);
    this.renderControl();
  }

  /**
   * Render the React component
   */
  private renderControl(): void {
    if (!this._root) return;

    this._root.render(
      React.createElement(ReactAttachmentVideoControl, {
        entityReference: this.entityReference,
        context: this._context,
        onError: this.handleError,
        onSuccess: this.handleSuccess,
        defectTempId: this.defectTempId,
        debugMode: this.debugMode,
      })
    );
  }

  /**
   * Handle error messages from the React component
   */
  private handleError = (message: string): void => {
    // You could add Dynamics 365 notification functionality here
    console.error(message);
  };

  /**
   * Handle success messages from the React component
   */
  private handleSuccess = (message: string): void => {
    // You could add Dynamics 365 notification functionality here
    console.log(message);
  };

  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    // Re-render the React component if needed
    this.renderControl();
  }

  /**
   * It is called by the framework prior to a control receiving new data.
   * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
   */
  public getOutputs(): IOutputs {
    return {
        defectTempId: this.defectTempId
    };
  }

  /**
   * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
   * i.e. cancelling any pending remote calls, removing listeners, etc.
   */
  public destroy(): void {
    if (this._root) {
      this._root.unmount();
      this._root = null;
    }
  }

  /**
   * Generate a GUID
   * @returns A generated GUID string
   */
  private generateGuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }
}
