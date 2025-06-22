import { imageRawData } from '../types/imageViewer';
import { generateGuid, genPluralName } from '../helpers/common';
import { IInputs } from '../../generated/ManifestTypes';
import { stringify } from 'querystring';

// Type definition for entity record returned from WebAPI
export interface Entity {
  [key: string]: unknown;
}

// Type definition for annotation record returned from WebAPI
export interface AnnotationRecord extends Entity {
  annotationid: string;
  documentbody: string;
  filename: string;
  mimetype: string;
  filesize: number;
  notetext: string;
}

// Type definition for PCF context with page properties
// export interface ExtendedContext {
//   page?: {
//     entityId: string;
//     entityTypeName: string;
//     getClientUrl: () => string;
//   };
//   webAPI: ComponentFramework.WebApi;
// }

// Interface for annotation entity
export interface NotesEntity {
  documentbody: string;
  filename: string;
  filesize: number;
  mimetype: string;
  subject: string;
  notetext: string;
  objecttypecode?: string;
  [key: string]: unknown; // For dynamic property
}

/**
 * Service for handling annotation operations in Dynamics 365
 */
/**
 * EntityReference class
 * @param entityTypeName - The type name of the entity
 * @param recordId - The id of the entity
 */
export class EntityReference {
  recordId : string;
  entityTypeName: string;
  constructor(entityTypeName: string, recordId: string) {
      this.recordId = recordId;
      this.entityTypeName = entityTypeName;
  }
}

export class AnnotationService {
  private context: ComponentFramework.Context<IInputs>;
  private entityName: string;
  private recordId: string;
  private defectTempId: string;
  private entityReference: EntityReference;

  /**
   * Creates a new instance of AnnotationService
   * @param context The context with WebAPI access
   * @param entityName The entity logical name
   * @param recordId The record ID (if saved)
   * @param defectTempId The temporary ID for unsaved records
   */
  constructor(context: ComponentFramework.Context<IInputs>, entityName: string, recordId: string, defectTempId: string) {
    this.context = context;
    this.entityName = entityName;
    this.recordId = recordId;
    this.defectTempId = defectTempId;
    this.entityReference = new EntityReference(entityName, recordId);
  }
  /**
   * Saves an image to the Dynamics 365 Annotation table
   * @param imageData The image data to save
   * @returns The updated image data with imageId
   */
  public async saveImageToAnnotation(imageData: imageRawData,isFormSaved:boolean): Promise<imageRawData> {
    try {
      console.log('[AnnotationService.saveImageToAnnotation] Saving image to annotation table');
      
      // Ensure image has an ID
      const imageId = imageData.imageId || generateGuid();
      imageData.imageId = imageId;
      
      if (!this.context.webAPI) {
        console.error('[AnnotationService.saveImageToAnnotation] WebAPI not available');
        return imageData;
      }
      
      // Extract file content (remove data URL prefix if present)
      const contentParts = imageData.content.split(',');
      const fileContent = contentParts.length > 1 ? contentParts[1] : imageData.content;
      
      // Try to find existing annotation for this image
      const existingRecord = await this.findAnnotationByImageId(imageId);
      
      if (existingRecord) {
        // Case 3 & 4: Update existing annotation
        return isFormSaved 
          ? await this.updateSavedFormAnnotation(existingRecord, imageData, fileContent)
          : await this.updateUnsavedFormAnnotation(existingRecord, imageData, fileContent);
      } else {
        // Case 1 & 2: Create new annotation
        return isFormSaved
          ? await this.createSavedFormAnnotation(imageData, fileContent)
          : await this.createUnsavedFormAnnotation(imageData, fileContent);
      }
    } catch (error) {
      console.error('[AnnotationService.saveImageToAnnotation] Error saving image to annotation:', error);
      throw error;
    }
  }
  
  /**
   * CASE 1: Creates an annotation for a saved form with direct object reference
   * @param imageData The image data to save
   * @param fileContent The base64 content of the file
   * @returns The updated image data
   */
  private async createSavedFormAnnotation(imageData: imageRawData, fileContent: string): Promise<imageRawData> {
    try {
      console.log('[AnnotationService.createSavedFormAnnotation] Case 1: Creating annotation with direct object reference');
      
      // Update entity reference to current context
      this.updateEntityReference();
      
      const notesEntity: NotesEntity = {
        documentbody: fileContent,
        filename: imageData.name,
        filesize: imageData.size,
        mimetype: imageData.type,
        subject: imageData.name,
        notetext: `Image Attachment with imageId: ${imageData.imageId}, DefectId: ${this.recordId}`,
        objecttypecode: this.entityReference.entityTypeName
      };
      
      // Add proper binding to the saved record
      const collectionName = this.getCollectionName();
      notesEntity[`objectid_${this.entityName}@odata.bind`] = `/${collectionName}(${this.recordId})`;
        
      const result = await this.context.webAPI.createRecord("annotation", notesEntity);
      console.log('[AnnotationService.createSavedFormAnnotation] New annotation created with ID:', result.id);
      
      return imageData;
    } catch (error) {
      console.error('[AnnotationService.createSavedFormAnnotation] Error creating saved form annotation:', error);
      return imageData;
    }
  }
  
  /**
   * CASE 2: Creates an annotation for an unsaved form using defectTempId
   * @param imageData The image data to save
   * @param fileContent The base64 content of the file
   * @returns The updated image data
   */
  private async createUnsavedFormAnnotation(imageData: imageRawData, fileContent: string): Promise<imageRawData> {
    try {
      console.log('[AnnotationService.createUnsavedFormAnnotation] Case 2: Creating annotation with temporary reference');
      
      // Update entity reference to current context
      this.updateEntityReference();
      
      const notesEntity: NotesEntity = {
        documentbody: fileContent,
        filename: imageData.name,
        filesize: imageData.size,
        mimetype: imageData.type,
        subject: imageData.name,
        notetext: `Image Attachment with imageId: ${imageData.imageId}, DefectId: ${this.defectTempId}`,
        // objecttypecode: this.entityReference.entityTypeName
      };
      
      const result = await this.context.webAPI.createRecord("annotation", notesEntity);
      console.log('[AnnotationService.createUnsavedFormAnnotation] New annotation created with ID:', result.id);
      
      return imageData;
    } catch (error) {
      console.error('[AnnotationService.createUnsavedFormAnnotation] Error creating unsaved form annotation:', error);
      return imageData;
    }
  }
  
  /**
   * CASE 3: Updates an annotation for a saved form with proper object reference
   * @param existingRecord The existing annotation record
   * @param imageData The updated image data
   * @param fileContent The base64 content of the file
   * @returns The updated image data
   */
  private async updateSavedFormAnnotation(
    existingRecord: AnnotationRecord, 
    imageData: imageRawData, 
    fileContent: string
  ): Promise<imageRawData> {
    try {
      console.log(`[AnnotationService.updateSavedFormAnnotation] Case 3: Updating annotation with proper object reference: ${existingRecord.annotationid}`);
      
      // Update entity reference to current context
      this.updateEntityReference();
      
      const updateEntity: NotesEntity = {
        documentbody: fileContent,
        filename: imageData.name,
        filesize: imageData.size,
        mimetype: imageData.type,
        subject: imageData.name,
        notetext: `Image Attachment with imageId: ${imageData.imageId}, DefectId: ${this.recordId}`
      };
      
      // Update the reference to point to the saved record
      const collectionName = this.getCollectionName();
      updateEntity[`objectid_${this.entityName}@odata.bind`] = `/${collectionName}(${this.recordId})`;
      
      await this.context.webAPI.updateRecord("annotation", existingRecord.annotationid, updateEntity);
      console.log(`[AnnotationService.updateSavedFormAnnotation] Updated annotation record: ${existingRecord.annotationid}`);
      
      return imageData;
    } catch (error) {
      console.error('[AnnotationService.updateSavedFormAnnotation] Error updating saved form annotation:', error);
      return imageData;
    }
  }
  
  /**
   * CASE 4: Updates an annotation for an unsaved form
   * @param existingRecord The existing annotation record
   * @param imageData The updated image data
   * @param fileContent The base64 content of the file
   * @returns The updated image data
   */
  private async updateUnsavedFormAnnotation(
    existingRecord: AnnotationRecord, 
    imageData: imageRawData, 
    fileContent: string
  ): Promise<imageRawData> {
    try {
      console.log(`[AnnotationService.updateUnsavedFormAnnotation] Case 4: Updating annotation with temporary reference: ${existingRecord.annotationid}`);
      
      const updateEntity: NotesEntity = {
        documentbody: fileContent,
        filename: imageData.name,
        filesize: imageData.size,
        mimetype: imageData.type,
        subject: imageData.name,
        notetext: `Image Attachment with imageId: ${imageData.imageId}, DefectId: ${this.defectTempId}`
      };
      
      await this.context.webAPI.updateRecord("annotation", existingRecord.annotationid, updateEntity);
      console.log(`[AnnotationService.updateUnsavedFormAnnotation] Updated annotation record: ${existingRecord.annotationid}`);
      
      return imageData;
    } catch (error) {
      console.error('[AnnotationService.updateUnsavedFormAnnotation] Error updating unsaved form annotation:', error);
      return imageData;
    }
  }
  
  /**
   * Updates the entity reference from the current context
   */
  private updateEntityReference(): void {
    this.entityReference = new EntityReference(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.context as any).page.entityTypeName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.context as any).page.entityId
    );
  }

  /**
   * Finds an annotation record by imageId
   * @param imageId The image ID to find
   * @returns The annotation record if found, null otherwise
   */
  public async findAnnotationByImageId(imageId: string): Promise<AnnotationRecord | null> {
    if (!this.context.webAPI) return null;
    
    try {
      // Safety check for null/empty values
      if (!imageId) {
        console.warn('[AnnotationService.findAnnotationByImageId] imageId is empty, cannot find annotation');
        return null;
      }
      
      // Properly escape single quotes for OData filter
      // const searchText = `imageId: ${imageId}`.replace(/'/g, "''");
      // const query = `?$select=annotationid,documentbody,filename,mimetype,filesize,notetext&$filter=contains(notetext, '${searchText}')`;
      const query = `?fetchXml=
      <fetch>
      <entity name="annotation">
        <attribute name="annotationid" />
        <attribute name="documentbody" />
        <attribute name="filename" />
        <attribute name="mimetype" />
        <attribute name="filesize" />
        <attribute name="notetext" />
        <filter type="and">
          <condition attribute="notetext" operator="like" value="%imageId: ${imageId}%" />
          <condition attribute="mimetype" operator="like" value="%image%" />
        </filter>
      </entity>
    </fetch>`;
      console.log(`[AnnotationService.findAnnotationByImageId] Query string: ${query}`);
      const result = await this.context.webAPI.retrieveMultipleRecords("annotation", query);
      if (result.entities.length > 0) {
        console.log(`[AnnotationService.findAnnotationByImageId] Found annotation for imageId ${imageId}: ${result.entities[0].annotationid}`);
        return result.entities[0] as unknown as AnnotationRecord;
      }
      
      return null;
    } catch (error) {
      console.error(`[AnnotationService.findAnnotationByImageId] Error finding annotation for imageId ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Deletes an annotation record for an image
   * @param imageId The image ID to delete
   * @returns True if successful, false otherwise
   */
  public async deleteAnnotationByImageId(imageId: string): Promise<boolean> {
    if (!this.context.webAPI) return false;
    
    try {
      console.log(`[AnnotationService.deleteAnnotationByImageId] Attempting to delete annotation for imageId: ${imageId}`);
      
      // Safety check for null/empty values
      if (!imageId) {
        console.warn('[AnnotationService.deleteAnnotationByImageId] imageId is empty, cannot delete annotation');
        return false;
      }
      
      // Properly escape single quotes for OData filter
      // const searchText = `imageId: ${imageId}`.replace(/'/g, "''");
      // const query = `?$select=annotationid&$filter=contains(notetext, '${searchText}')`;
      const query = `?fetchXml=
      <fetch>
      <entity name="annotation">
        <attribute name="annotationid" />
        <filter type="and">
          <condition attribute="notetext" operator="like" value="%imageId: ${imageId}%" />
          <condition attribute="mimetype" operator="like" value="%image%" />
        </filter>
      </entity>
    </fetch>`;
      console.log(`[AnnotationService.deleteAnnotationByImageId] Query string: ${query}`);
      const result = await this.context.webAPI.retrieveMultipleRecords("annotation", query);
      
      if (result.entities.length > 0) {
        await this.context.webAPI.deleteRecord("annotation", result.entities[0].annotationid);
        console.log(`[AnnotationService.deleteAnnotationByImageId] Deleted annotation with ID: ${result.entities[0].annotationid}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[AnnotationService.deleteAnnotationByImageId] Error deleting annotation:', error);
      return false;
    }
  }

  /**
   * Queries all images from annotations for this defect
   * @returns Array of image data
   */
  public async queryImagesFromAnnotations(isFormSaved:boolean): Promise<imageRawData[]> {
    try {
      const defectId = this.getDefectId();
      console.log(`[AnnotationService.queryImagesFromAnnotations] Querying images from annotations, isFormSaved: ${isFormSaved}, defectId: ${defectId}`);
      
      if (this.context.webAPI) {
        let query: string;
        
        if (isFormSaved) {
          // query = `?$select=annotationid,documentbody,filename,mimetype,filesize,notetext&$filter=_objectid_value eq ${this.recordId}`;
          query = `?fetchXml=
                  <fetch>
                  <entity name="annotation">
                    <attribute name="annotationid" />
                    <attribute name="documentbody" />
                    <attribute name="filename" />
                    <attribute name="mimetype" />
                    <attribute name="filesize" />
                    <attribute name="notetext" />
                    <filter type="and">
                      <condition attribute="objectid" operator="eq" value="${this.recordId}" />
                      <condition attribute="mimetype" operator="like" value="%image%" />
                    </filter>
                  </entity>
                </fetch>`
        } else {
          // Safety check for null/empty values
          if (!defectId) {
            console.warn('[AnnotationService.queryImagesFromAnnotations] defectId is empty, cannot query annotations');
            return [];
          }
          
          query = `?fetchXml=
                  <fetch>
                  <entity name="annotation">
                    <attribute name="annotationid" />
                    <attribute name="documentbody" />
                    <attribute name="filename" />
                    <attribute name="mimetype" />
                    <attribute name="filesize" />
                    <attribute name="notetext" />
                    <filter type="and">
                      <condition attribute="notetext" operator="like" value="%DefectId: ${defectId}%" />
                      <condition attribute="mimetype" operator="like" value="%image%" />
                    </filter>
                  </entity>
                </fetch>`;
        }
        try {
          console.log(`[AnnotationService.queryImagesFromAnnotations] Query string: ${query}`);
          const annotations = await this.context.webAPI.retrieveMultipleRecords("annotation", query);
          console.log(`[AnnotationService.queryImagesFromAnnotations] Found ${annotations.entities.length} annotations`);
          // console.log(`[AnnotationService.queryImagesFromAnnotations] Found ${JSON.stringify(annotations.entities)} annotations`);
          const images: imageRawData[] = annotations.entities.map((entity: Entity) => {
            const annotation = entity as unknown as AnnotationRecord;
            const imageIdMatch = annotation.notetext.match(/imageId: ([^,]+)/);
            const imageId = imageIdMatch ? imageIdMatch[1].trim() : generateGuid();
            
            return {
              name: annotation.filename,
              type: annotation.mimetype,
              size: annotation.filesize,
              content: `data:${annotation.mimetype};base64,${annotation.documentbody}`,
              imageId: imageId,
            };
          });
          
          console.log(`[AnnotationService.queryImagesFromAnnotations] Found ${images.length} images in annotations`);
          return images;
        } catch (apiError) {
          console.log(`[AnnotationService.queryImagesFromAnnotations] Filter string: ${query}`);
          console.error('[AnnotationService.queryImagesFromAnnotations] Error retrieving annotations:', apiError);
          return [];
        }
      }
      
      return [];
    } catch (error) {
      console.error('[AnnotationService.queryImagesFromAnnotations] Error querying annotations:', error);
      return [];
    }
  }

  /**
   * Updates annotation records when the defect record is saved
   * @returns True if successful, false otherwise
   */
  public async updateAnnotationsOnSave(isFormSaved:boolean): Promise<boolean> {
    if (!this.context.webAPI || !isFormSaved || !this.recordId) return false;
    
    try {
      console.log(`[AnnotationService.updateAnnotationsOnSave] Form saved, updating annotations with defectTempId: ${this.defectTempId}`);
      
      // Safety check to avoid malformed queries
      if (!this.defectTempId) {
        console.warn('[AnnotationService.updateAnnotationsOnSave] defectTempId is empty, cannot update annotations');
        return false;
      }
      
      // Make sure to properly escape single quotes for OData filter
      // const searchText = `DefectId: ${this.defectTempId}`.replace(/'/g, "''");
      // const query = `?$select=annotationid&$filter=contains(notetext, '${searchText}')`;
      const query = `?fetchXml=
      <fetch>
      <entity name="annotation">
        <attribute name="annotationid" />
        <attribute name="documentbody" />
        <attribute name="filename" />
        <attribute name="mimetype" />
        <attribute name="filesize" />
        <attribute name="notetext" />
        <filter type="and">
          <condition attribute="notetext" operator="like" value="%DefectId: ${this.defectTempId}%" />
          <condition attribute="mimetype" operator="like" value="%image%" />
        </filter>
      </entity>
    </fetch>`;
      console.log(`[AnnotationService.updateAnnotationsOnSave] Query: ${query}`);
      
      const result = await this.context.webAPI.retrieveMultipleRecords("annotation", query);
      
      if (result.entities.length > 0) {
        console.log(`[AnnotationService.updateAnnotationsOnSave] Found ${result.entities.length} annotations to update with objectid reference`);
        
        const collectionName = this.getCollectionName();
        const updatePromises = result.entities.map(entity => {
          return this.context.webAPI.updateRecord("annotation", entity.annotationid, {
            objecttypecode: this.entityName,
            [`objectid_${this.entityName}@odata.bind`]: `/${collectionName}(${this.recordId})`
          });
        });
        
        await Promise.all(updatePromises);
        console.log(`[AnnotationService.updateAnnotationsOnSave] Successfully updated ${result.entities.length} annotations`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[AnnotationService.updateAnnotationsOnSave] Error updating annotations on save:', error);
      return false;
    }
  }

  /**
   * Gets the current defect ID (record ID if saved, temp ID otherwise)
   * @returns The defect ID
   */
  private getDefectId(): string {
    return this.recordId || this.defectTempId;
  }

  /**
   * Gets the collection name for the entity
   * @returns The collection name
   */
  private getCollectionName(): string {
    return genPluralName(this.entityName);
  }
} 