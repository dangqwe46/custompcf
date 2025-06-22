import { createRoot, Root } from "react-dom/client";
import {IInputs, IOutputs} from "./generated/ManifestTypes";
import { createElement } from "react";
import App from "../src/components/App";

export class LabelToolTipControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _root: Root;
    private _observer: MutationObserver | null = null;
    private _context: ComponentFramework.Context<IInputs>;

    /**
     * Empty constructor.
     */
    constructor()
    {

    }

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
     */
    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container:HTMLDivElement): void
    {
        this._container = container;
        this._root = createRoot(this._container);
        this._context = context;
        // Setup a MutationObserver to watch for DOM changes for hide label
        this.setupFormElementObserver(context.parameters.FieldLogicalName.raw as string);
    }

    /**
     * Setup MutationObserver to find and modify the target element
     */
    private setupFormElementObserver(logicalName:string): void {
        // Try to find the form element by traversing up from our container
        let formElement: HTMLElement | null = this._container;
        while (formElement && formElement.tagName !== 'BODY' && !formElement.classList.contains('form')) {
            formElement = formElement.parentElement;
        }
        
        // If we found the form element or reached the body, start observing
        const targetElement = formElement || document.body;
        
        // Create a MutationObserver to watch for the target element
        this._observer = new MutationObserver((mutations, observer) => {
            // Track if we've found and modified both elements
            let fieldElementFound = false;
            let labelDivElementFound = false;

            // Look for the target element with data-id
            const fieldElement = targetElement.querySelector(`[data-id="${logicalName}"]`);
            if (fieldElement) {
                // Apply the padding style
                (fieldElement as HTMLElement).style.paddingTop = "0px";
                fieldElementFound = true;
                console.log("fieldElement", fieldElement);
            }
            
            // Find the label element by ID pattern
            const labelElements = targetElement.querySelectorAll(`label[id*="${logicalName}-field-label"]`);
            if (labelElements && labelElements.length > 0) {
                // Find the parent div that matches the criteria
                for (let i = 0; i < labelElements.length; i++) {
                    const label = labelElements[i];
                    let parentDiv = label.parentElement;
                    
                    // Check if the parent div has the required attributes
                    if (parentDiv && 
                        parentDiv.getAttribute('role') === 'presentation' && 
                        parentDiv.classList.contains('flexbox')) {
                        
                        // Set display to none
                        (parentDiv as HTMLElement).style.display = 'none';
                        labelDivElementFound = true;
                        console.log("Label parent div hidden", parentDiv);
                        break;
                    }
                }
            }
            
            // Disconnect observer if both elements are found and modified
            if (fieldElementFound && labelDivElementFound) {
                observer.disconnect();
                this._observer = null;
                console.log("All elements found and modified");
            }
            
        });
        
        // Start observing with configuration
        this._observer.observe(targetElement, {
            childList: true,
            subtree: true,
            attributes: false
        });
        
        // Set a timeout to stop the observer after a reasonable time
        setTimeout(() => {
            if (this._observer) {
                this._observer.disconnect();
                this._observer = null;
            }
        }, 10000); // Stop after 10 seconds if element not found
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void
    {
        this._root.render(
            createElement(App, 
            {
                context
            })
        );
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
     */
    public getOutputs(): IOutputs
    {
        return {};
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void
    {
        // Cleanup the MutationObserver if it exists
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
    }
}
