
import { Annotation } from "../components/VideoGallery";
import { IInputs } from "../generated/ManifestTypes";

// EntityReference type
export interface EntityReference {
  entityId: string|null;
  entityRecordName: string|null;
  entityTypeName:string
}

export class AnnotationService {
  private context: ComponentFramework.Context<IInputs>;
  private MAX_VIDEOS: number;

  constructor(context: ComponentFramework.Context<IInputs>, maxVideos = 2) {
    this.context = context;
    this.MAX_VIDEOS = maxVideos;
  }

  // Helper function to get collection name from logical name
  public collectionNameFromLogicalName(entityLogicalName: string): string {
    if (entityLogicalName[entityLogicalName.length - 1] !== "s") {
      return `${entityLogicalName}s`;
    } else {
      return `${entityLogicalName}es`;
    }
  }

  // Fetch videos by entity ID
  public async fetchVideosByEntityId(
    entityReference: EntityReference
  ): Promise<Annotation[] | null> {
    if (!entityReference?.entityId) return null;

    // Query to fetch annotations related to the entity
    // const query = `$filter=_objectid_value eq '${entityReference.id}'&$orderby=createdon desc&$top=${this.MAX_VIDEOS}`;
    const query = `?fetchXml=
              <fetch>
              <entity name="annotation">
                <attribute name="annotationid" />
                <attribute name="documentbody" />
                <attribute name="filename" />
                <attribute name="mimetype" />
                <attribute name="filesize" />
                <attribute name="notetext" />
                <attribute name="objectid" />
                <filter type="and">
                  <condition attribute="objectid" operator="eq" value="${entityReference.entityId}" />
                  <condition attribute="mimetype" operator="like" value="%video%" />
                </filter>
              </entity>
            </fetch>`;
    const result = await this.context.webAPI.retrieveMultipleRecords(
      "annotation",
      query
    );
    if (result.entities && result.entities.length > 0) {
      const videoAnnotations: Annotation[] = [];
      for (const entity of result.entities) {
        const annotation: Annotation = {
          annotationid: entity.annotationid,
          documentbody: entity.documentbody,
          filename: entity.filename,
          mimetype: entity.mimetype,
          filesize: entity.filesize,
          notetext: entity.notetext,
          objectid: entity.objectid,
        };
        videoAnnotations.push(annotation);
      }
      return videoAnnotations;
    } else {
      return null;
    }
  }

  // Fetch videos by temp ID
  public async fetchVideosByTempId(
    defectTempId: string
  ): Promise<Annotation[] | null> {
    if (!defectTempId) return null;

    // Query to fetch annotations with the temp ID in notetext
    // const query = `$filter=contains(notetext,'DefectId: ${defectTempId}')&$orderby=createdon desc&$top=${this.MAX_VIDEOS}`;
    const query = `?fetchXml=
                  <fetch>
                  <entity name="annotation">
                    <attribute name="annotationid" />
                    <attribute name="documentbody" />
                    <attribute name="filename" />
                    <attribute name="mimetype" />
                    <attribute name="filesize" />
                    <attribute name="notetext" />
                    <attribute name="objectid" />
                    <filter type="and">
                      <condition attribute="notetext" operator="like" value="%DefectId: ${defectTempId}%" />
                      <condition attribute="mimetype" operator="like" value="%video%" />
                    </filter>
                  </entity>
                </fetch>`;
    const result = await this.context.webAPI.retrieveMultipleRecords(
      "annotation",
      query
    );
    if (result.entities && result.entities.length > 0) {
      const videoAnnotations: Annotation[] = [];
      for (const entity of result.entities) {
        const annotation: Annotation = {
          annotationid: entity.annotationid,
          documentbody: entity.documentbody,
          filename: entity.filename,
          mimetype: entity.mimetype,
          filesize: entity.filesize,
          notetext: entity.notetext,
          objectid: entity.objectid,
        };
        videoAnnotations.push(annotation);
      }
      return videoAnnotations;
    } else {
      return null;
    }
  }

  // Process query results and return annotations array
  /*private async processQueryResults(
    result: ComponentFramework.WebApi.RetrieveMultipleResponse
  ): Promise<Annotation[]> {
    if (result.entities && result.entities.length > 0) {
      const annotationIds = result.entities.map(
        (entity) => entity.annotationid
      );
      const videoAnnotations: Annotation[] = [];

      // Fetch full details for each annotation (including document body)
      for (const id of annotationIds) {
        try {
          const annotation = (await this.context.webAPI.retrieveRecord(
            "annotation",
            id,
            "?$select=annotationid,documentbody,filename,mimetype,notetext"
          )) as Annotation;

          if (annotation.mimetype.startsWith("video/")) {
            videoAnnotations.push(annotation);
          }
        } catch (error) {
          console.error(`Error fetching annotation ${id}:`, error);
        }
      }

      return videoAnnotations;
    }

    return [];
  }*/

  // Create annotation entity object
  public createAnnotationEntity(
    fileName: string,
    fileContent: string,
    mimeType: string,
    fileSize: number,
    entityReference: EntityReference | null,
    defectTempId: string
  ) {
    interface AnnotationEntity {
      documentbody: string;
      filename: string;
      filesize: number;
      mimetype: string;
      subject: string;
      notetext: string;
      objecttypecode?: string;
      [key: string]: string | number | undefined;
    }

    // Generate a unique videoId
    const videoId = this.generateGuid();

    const notesEntity: AnnotationEntity = {
      documentbody: fileContent,
      filename: fileName,
      filesize: fileSize,
      mimetype: mimeType,
      subject: fileName,
      notetext: "",
    };
    if(entityReference && entityReference.entityId && entityReference.entityId !== "00000000-0000-0000-0000-000000000000") {
      // Form is saved - use entity reference
      notesEntity.notetext = `Video Attachment with videoId: ${videoId}, DefectId: ${entityReference?.entityId}`;
      notesEntity.objecttypecode = entityReference?.entityTypeName;
      notesEntity[
        `objectid_${entityReference?.entityTypeName}@odata.bind`
      ] = `/${this.collectionNameFromLogicalName(entityReference?.entityTypeName)}(${
        entityReference?.entityId
      })`;
    } else {
      // Form not saved - use temp ID in notetext
      notesEntity.notetext = `Video Attachment with videoId: ${videoId}, DefectId: ${defectTempId}`;
    }

    return notesEntity;
  }

  // Generate a GUID
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

  // Create a new annotation
  public async createAnnotation(
    notesEntity: Record<string, string | number | undefined>
  ): Promise<string | null> {
    const response = await this.context.webAPI.createRecord(
      "annotation",
      notesEntity
    );

    if (response && response.id) {
      return response.id;
    }
    return null;
  }

  // Update an existing annotation
  public async updateAnnotation(
    annotationId: string,
    notesEntity: Record<string, string | number | undefined>
  ): Promise<void> {
    await this.context.webAPI.updateRecord(
      "annotation",
      annotationId,
      notesEntity
    );
  }

  // Delete an annotation
  public async deleteAnnotation(annotationId: string): Promise<void> {
    await this.context.webAPI.deleteRecord("annotation", annotationId);
  }
}
