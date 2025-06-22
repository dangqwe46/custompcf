/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    controlLabel: ComponentFramework.PropertyTypes.StringProperty;
    FieldLogicalName: ComponentFramework.PropertyTypes.StringProperty;
    isRequired: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    FieldLabel: ComponentFramework.PropertyTypes.StringProperty;
    TooltipsContent: ComponentFramework.PropertyTypes.StringProperty;
    Image1Base64: ComponentFramework.PropertyTypes.StringProperty;
    Image2Base64: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    controlLabel?: string;
}
