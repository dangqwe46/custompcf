import * as React from "react";
import { IInputs } from "../../generated/ManifestTypes";
import { useState, useEffect, useRef } from "react";
import ScaleLoader from "react-spinners/ScaleLoader";
import { MessageBar, MessageBarType } from "@fluentui/react";
import { Dialog, DialogType, DialogFooter } from "@fluentui/react/lib/Dialog";
import {
  PrimaryButton,
  DefaultButton,
  IconButton,
} from "@fluentui/react/lib/Button";
import { Stack } from "@fluentui/react/lib/Stack";
import { imageViewerData, imageRawData } from "../types/imageViewer";
import { AnnotationService } from "../services/annotationService";
import { ImageService } from "../services/imageService";
import { ImageGalleryViewer } from "./ImageGalleryViewer";
import { ImageToolbar } from "./ImageToolbar";
import { LogViewer } from "./LogViewer";
import { generateGuid } from "../helpers/common";
import { saveAs } from "file-saver";

export type ImageViewerWrapperProps = {
  pcfContext: ComponentFramework.Context<IInputs>;
  defectTempId: string;
  debugMode: boolean;
  updateOutput?: (value: string) => void;
};

export const ImageViewerWrapper: React.FC<ImageViewerWrapperProps> = ({
  pcfContext,
  defectTempId,
  debugMode,
}) => {
  // Get form context if available
  const context = pcfContext as ComponentFramework.Context<IInputs>;
  // Use any type casting to access page properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entityName = (context as any).page?.entityTypeName || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordId = (context as any).page?.entityId || "";

  // Generate GUID if defectTempId is empty
  const initialDefectTempId = defectTempId;
  // Use a DefectTempId for unsaved records
  const defectTempIdRef = useRef<string>(initialDefectTempId);

  // State for component
  const [imageViewerList, setImageViewerList] = useState<imageViewerData[]>([]);
  const [imageRawData, setImageRawData] = useState<imageRawData[]>([]);
  const [currentUIState, setCurrentUIState] = useState("loader");
  let isFormSaved = false;

  // Refs for component
  const tempImageRawData = useRef<imageRawData[]>([]);
  const currentIndex = useRef(0);
  const messageBarText = useRef("");
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  // Detect mobile devices
  const isMobile = useRef(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  );

  // Initialize services
  const annotationService = useRef(
    new AnnotationService(
      context,
      entityName,
      recordId,
      defectTempIdRef.current || ""
    )
  );
  const imageService = useRef(new ImageService());

  // Enable container resize tracking
  pcfContext.mode.trackContainerResize(true);

  // Add state for logs panel
  const [showLogs, setShowLogs] = useState(false);

  // Initialize component
  useEffect(() => {
    console.log(
      `[ImageViewerWrapper.init] Device detection - Is Mobile: ${isMobile.current}`
    );

    // Check if the form is already saved
    const initialFormSavedStatus =
      recordId !== null &&
      recordId !== undefined &&
      recordId !== "" &&
      recordId !== "00000000-0000-0000-0000-000000000000";
    console.log(`[ImageViewerWrapper.init] recordId: ${recordId}`);
    console.log(
      `[ImageViewerWrapper.init] Initial form saved status (calculated): ${initialFormSavedStatus}`
    );

    // Set state (will be available in next render cycle)
    isFormSaved = initialFormSavedStatus;
    console.log(`[ImageViewerWrapper.init] isFormSaved: ${isFormSaved}`);
    // Add custom styles for image gallery
    const styleElement = document.createElement("style");
    styleElement.innerHTML = `
        .mobile-gallery{
        max-width: 300px;
        }
        .mobile-gallery .image-gallery-image img{
        object-fit: contain !important;
        background-color: #f5f5f5;
        }
    `;
    document.head.appendChild(styleElement);

    // Load images from annotations when component mounts - use the calculated value
    loadImagesFromAnnotations(initialFormSavedStatus);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Monitor form saved status and update it based on recordId
  useEffect(() => {
    const savedNow =
      recordId !== null &&
      recordId !== undefined &&
      recordId !== "" &&
      recordId !== "00000000-0000-0000-0000-000000000000";

    console.log(
      `[ImageViewerWrapper.formStatusEffect] recordId: ${recordId}, savedNow: ${savedNow}, isFormSaved: ${isFormSaved}`
    );

    // Always update the isFormSaved state based on current recordId value
    if (savedNow !== isFormSaved) {
      console.log(
        `[ImageViewerWrapper.formStatusEffect] Updating isFormSaved from ${isFormSaved} to ${savedNow}`
      );
      isFormSaved = savedNow;
      // If it transitioned from unsaved to saved - use the direct value instead of state
      if (savedNow && !isFormSaved) {
        console.log(
          `[ImageViewerWrapper.formStatusEffect] Form transitioned from unsaved to saved with recordId: ${recordId}`
        );

        // Update existing annotations to point to the saved record - pass the direct value
        annotationService.current.updateAnnotationsOnSave(savedNow);
      }
    }
  }, [recordId, isFormSaved]);

  // Keep AnnotationService updated with current values
  useEffect(() => {
    console.log(
      `[ImageViewerWrapper.serviceUpdateEffect] Updating AnnotationService with recordId: ${recordId}, isFormSaved: ${isFormSaved}`
    );

    // Update service with current values
    annotationService.current = new AnnotationService(
      context,
      entityName,
      recordId,
      defectTempIdRef.current || ""
    );
  }, [recordId, isFormSaved, entityName]);

  // Convert raw image data to viewer format
  useEffect(() => {
    const tempList = imageRawData.map((element: imageRawData) => {
      // Create the base image data object
      const imageData: imageViewerData = {
        original: element.content,
        thumbnail: element.content,
        name: element.name,
      };

      // Add originalHeight only on mobile devices
      if (isMobile.current) {
        imageData.originalHeight = 200;
      }

      return imageData;
    });

    setImageViewerList(tempList);
  }, [imageRawData]);

  // Function to load images from annotations
  const loadImagesFromAnnotations = async (formSavedStatus = isFormSaved) => {
    setCurrentUIState("loader");

    try {
      // Query annotations from Dynamics 365
      console.log(
        "[ImageViewerWrapper.loadImagesFromAnnotations] Querying annotations from Dynamics 365"
      );
      console.log(
        `[ImageViewerWrapper.loadImagesFromAnnotations] Using form saved status: ${formSavedStatus}`
      );
      const images = await annotationService.current.queryImagesFromAnnotations(
        formSavedStatus
      );

      if (images && images.length > 0) {
        console.log(
          `[ImageViewerWrapper.loadImagesFromAnnotations] Found ${images.length} images`
        );
        setImageRawData(images);
        setCurrentUIState("viewer");
      } else {
        console.log(
          "[ImageViewerWrapper.loadImagesFromAnnotations] No images found"
        );
        setCurrentUIState("dropImage");
      }
    } catch (error) {
      console.error(
        "[ImageViewerWrapper.loadImagesFromAnnotations] Error loading images:",
        error
      );
      setCurrentUIState("dropImage");
    }
  };

  // Function to add a new image
  const appendImage = async (newImagesToAdd: imageRawData[]) => {
    console.log(
      `[ImageViewerWrapper.appendImage] Append Image with ${newImagesToAdd.length} new images`
    );

    // Get current form saved status to ensure consistency
    const currentFormSavedStatus =
      recordId !== null &&
      recordId !== undefined &&
      recordId !== "" &&
      recordId !== "00000000-0000-0000-0000-000000000000";
    console.log(
      `[ImageViewerWrapper.appendImage] Current form saved status: ${currentFormSavedStatus}`
    );

    // Validate the image collection (combining existing + new images)
    const combinedImageCollection = [...imageRawData, ...newImagesToAdd];
    const validationResult = imageService.current.validateImageCollection(
      combinedImageCollection
    );

    if (!validationResult.isValid) {
      console.log(
        `[ImageViewerWrapper.appendImage] Validation failed: ${validationResult.errorMessage}`
      );
      messageBarText.current =
        validationResult.errorMessage || "Invalid image collection";
      setCurrentUIState("messageBar");
      return;
    }

    setCurrentUIState("loader");

    try {
      // Process only the new images that need to be uploaded
      console.log(
        `[ImageViewerWrapper.appendImage] Processing ${newImagesToAdd.length} new images`
      );
      const processedNewImages = await Promise.all(
        newImagesToAdd.map(async (img) => {
          return await annotationService.current.saveImageToAnnotation(
            img,
            currentFormSavedStatus
          );
        })
      );

      // Combine existing images with newly processed ones
      const updatedImageData = [...imageRawData, ...processedNewImages];
      tempImageRawData.current = [];
      setImageRawData(updatedImageData);

      // Set appropriate UI state based on images
      if (updatedImageData.length === 0) {
        setCurrentUIState("dropImage");
      } else {
        setCurrentUIState("viewer");
      }

      console.log(
        `[ImageViewerWrapper.appendImage] Images updated successfully, total: ${updatedImageData.length}`
      );
    } catch (error) {
      console.error(
        "[ImageViewerWrapper.appendImage] Error appending images:",
        error
      );
      messageBarText.current = "Error saving images. Please try again.";
      setCurrentUIState("messageBar");
    }
  };

  // Function to delete an image
  const deleteImage = async (index: number) => {
    console.log(`[ImageViewerPCF] Delete Image at index ${index}`);
    setCurrentUIState("loader");

    const updatedRawData = [...imageRawData];
    const imageToDelete = updatedRawData[index];

    try {
      // Delete from annotations if it has an imageId
      if (imageToDelete.imageId) {
        await annotationService.current.deleteAnnotationByImageId(
          imageToDelete.imageId
        );
      }

      // Remove from local array
      updatedRawData.splice(index, 1);
      setImageRawData(updatedRawData);
      currentIndex.current = 0;

      // Set appropriate UI state
      if (updatedRawData.length === 0) {
        setCurrentUIState("dropImage");
      } else {
        setCurrentUIState("viewer");
      }
    } catch (error) {
      console.error("[ImageViewerPCF] Error deleting image:", error);
      messageBarText.current = "Error deleting image. Please try again.";
      setCurrentUIState("messageBar");
    }
  };

  // Function to handle file upload
  const handleFile = async (fileList: FileList) => {
    setCurrentUIState("loader");
    const newImages: imageRawData[] = [];

    try {
      // Only use the first file since we don't allow multiple selection now
      if (fileList.length === 0) {
        console.log(`[ImageViewerWrapper.handleFile] No files selected`);
        setCurrentUIState("viewer");
        return;
      }

      // Check if adding this file would exceed the 10 image limit
      if (imageRawData.length >= 10) {
        messageBarText.current = `You can upload a maximum of 10 images.`;
        setCurrentUIState("messageBar");
        return;
      }

      // Process the single file
      const file = fileList[0];
      console.log(
        `[ImageViewerWrapper.handleFile] Processing single file: ${file.name}`
      );

      try {
        // Process the file
        const processedImage = await imageService.current.processFile(file);
        newImages.push(processedImage);

        // Check if we've exceed size limits after adding this image
        const validationResult = imageService.current.validateImageCollection([
          ...imageRawData,
          ...newImages,
        ]);

        if (!validationResult.isValid) {
          messageBarText.current =
            validationResult.errorMessage ||
            `Adding image "${file.name}" would exceed storage limits.`;
          setCurrentUIState("messageBar");
          return;
        }
      } catch (fileError) {
        console.error(
          `[ImageViewerWrapper.handleFile] Error processing file ${file.name}:`,
          fileError
        );
        // If it's a validation error, show the message
        if (fileError instanceof Error) {
          messageBarText.current = fileError.message;
          setCurrentUIState("messageBar");
          return;
        }
      }

      // Upload the new image
      await appendImage(newImages);
    } catch (error) {
      console.error(
        "[ImageViewerWrapper.handleFile] Error handling files:",
        error
      );
      messageBarText.current = "Error uploading image. Please try again.";
      setCurrentUIState("messageBar");
    }
  };

  // Handle file drop
  const fileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (e.dataTransfer.files.length > 0) {
      console.log(
        `[ImageViewerWrapper.fileDrop] ${e.dataTransfer.files.length} file(s) dropped, processing only the first one`
      );
      // Only process the first file, even if multiple are dropped
      const singleFile = new DataTransfer();
      singleFile.items.add(e.dataTransfer.files[0]);
      handleFile(singleFile.files);
    }
  };

  // Handle file input change
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFile(event.target.files);
    }
  };

  // Handle upload button click
  const handleUploadClick = () => {
    if (hiddenFileInput.current) {
      hiddenFileInput.current.click();
    }
  };

  // Handle file download
  const fileDownload = (index: number) => {
    try {
      const imageName = imageRawData[index].name;
      const imageContent = imageRawData[index].content;
      const imageSize = imageRawData[index].size;
      const imageType = imageRawData[index].type;
      // console.log(
      //   `[ImageViewerPCF] Start download image ${imageName} by openUrl`
      // );
      // pcfContext.navigation.openUrl(`${imageContent}`);
      // console.log(`[ImageViewerPCF] Triggered download Image ${imageName}`);
      console.log(
        `[ImageViewerPCF] Triggered download image ${imageName} by openFile`
      );
      pcfContext.navigation.openFile(
        {
          fileContent: imageContent.split(",")[1],
          fileName: imageName,
          fileSize: imageSize / 1000,
          mimeType: imageType,
        },
        {
          openMode: 2, //Save to disk
        }
      );
      /*
      if (isMobile.current) {
        /*pcfContext.navigation.openFile(
          {
            fileContent: imageContent,
            fileName: imageName,
            fileSize: imageSize,
            mimeType: imageType,
          } as ComponentFramework.FileObject,
          {
            openMode: 2, //Save to disk
          } as ComponentFramework.NavigationApi.OpenFileOptions
        );
        pcfContext.navigation.openUrl(`data:${imageType};base64,${imageContent}`)
      } else {
        // Convert base64 data URL to Blob
        const dataURLParts = imageContent.split(",");
        const mimeMatch = dataURLParts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (imageType || "image/jpeg");
        const byteString = atob(dataURLParts[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([arrayBuffer], { type: mime });
        
        // Use FileSaver.js to save the file
        saveAs(blob, imageName);
      }*/
    } catch (error) {
      console.error("[ImageViewerPCF] Error downloading image:", error);
      messageBarText.current = "Error downloading image. Please try again.";
      setCurrentUIState("messageBar");
    }
  };

  // Handle camera capture
  const handleCameraCapture = async () => {
    try {
      console.log("[ImageViewerPCF] Attempting to capture image from camera");
      setCurrentUIState("loader");

      // Use PCF API to capture image from device camera
      const imageFile = await pcfContext.device.captureImage();

      // Process the file
      const processedImage = await imageService.current.processFileFromCamera(
        imageFile
      );

      // Create an array with just the new image
      const newImage = [processedImage];

      // Validate combined collection
      const validationResult = imageService.current.validateImageCollection([
        ...imageRawData,
        ...newImage,
      ]);

      if (!validationResult.isValid) {
        messageBarText.current =
          validationResult.errorMessage || "Image exceeds storage limits.";
        setCurrentUIState("messageBar");
        return;
      }

      // Update images - only adding the new one
      await appendImage(newImage);
    } catch (error) {
      console.error("[ImageViewerPCF] Camera capture error:", error);
      messageBarText.current = "Failed to capture image. Please try again.";
      setCurrentUIState("messageBar");
    }
  };

  // Add toggle logs handler
  const toggleLogs = () => {
    setShowLogs(!showLogs);
  };

  // Event handlers
  const dragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const dragEnter = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const dragLeave = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDeleteClick = () => setCurrentUIState("deleteDialog");
  const handleDialogCancel = () => setCurrentUIState("viewer");
  const handleSlideChange = (index: number) => (currentIndex.current = index);
  const handleDownloadClick = () => fileDownload(currentIndex.current);
  const handleDeleteConfirm = () => deleteImage(currentIndex.current);
  const handleMessageBarDismiss = () => setCurrentUIState("viewer");

  // Dialog configuration
  const modalPropsStyles = { main: { maxWidth: 450 } };
  const dialogContentProps = {
    type: DialogType.normal,
    title: "Confirm Delete",
    subText: "Do you want to delete the current image?",
  };

  return (
    <div
      // Only apply drag and drop handlers for non-mobile devices
      {...(!isMobile.current && {
        onDragOver: dragOver,
        onDragEnter: dragEnter,
        onDragLeave: dragLeave,
        onDrop: fileDrop,
      })}
      style={{
        display: "block",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Message Bar */}
      {currentUIState === "messageBar" && (
        <MessageBar
          messageBarType={MessageBarType.blocked}
          isMultiline={false}
          onDismiss={handleMessageBarDismiss}
          dismissButtonAriaLabel="Close"
          truncated={true}
        >
          {messageBarText.current}
        </MessageBar>
      )}

      {/* Toolbar with Logs Button */}
      {["viewer", "dropImage"].includes(currentUIState) && (
        <Stack horizontal horizontalAlign="space-between">
          <ImageToolbar
            currentUIState={currentUIState}
            isMobile={isMobile.current}
            onDownload={handleDownloadClick}
            onUpload={handleUploadClick}
            onCapture={handleCameraCapture}
            onDelete={handleDeleteClick}
          />
          {debugMode && (
            <IconButton
              iconProps={{ iconName: "ReceiptCheck" }}
              title="View Logs"
              onClick={toggleLogs}
            />
          )}
        </Stack>
      )}

      {/* File Input (hidden) */}
      <input
        type="file"
        onChange={handleChange}
        ref={hiddenFileInput}
        style={{ display: "none" }}
        accept="image/jpeg,image/png,image/gif,image/bmp,image/webp"
      />

      {/* Main Content Area */}
      {currentUIState === "dropImage" && isMobile.current ? (
        <div className="image-gallery-container">
          <p style={{margin: "10px 0"}}>No photos available. You can upload up to 10 photos.</p>
          <div className="no-images-message">No photos available</div>
        </div>
      ) : (
        <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "350px",
          minWidth: "250px",
        }}
      >
        {/* Loader */}
        {currentUIState === "loader" && (
          <ScaleLoader aria-label="Loading Spinner" data-testid="loader" />
        )}

        {/* Image Gallery */}
        {["viewer", "deleteDialog", "messageBar"].includes(currentUIState) && (
          <ImageGalleryViewer
            images={imageViewerList}
            onSlideChange={handleSlideChange}
            isMobile={isMobile.current}
          />
        )}
        {/* Drop Zone */}
        {currentUIState === "dropImage" && (
          <div className="drop-zone">
              <div className="drop-placeholder">DROP IMAGE HERE</div>
          </div>
        )}
      </div>)}

      {/* Logs Viewer Component */}
      {debugMode && <LogViewer isOpen={showLogs} onDismiss={toggleLogs} />}

      {/* Delete Confirmation Dialog */}
      <Dialog
        hidden={currentUIState !== "deleteDialog"}
        onDismiss={handleDialogCancel}
        dialogContentProps={dialogContentProps}
        modalProps={{ isBlocking: true, styles: modalPropsStyles }}
      >
        <DialogFooter>
          <PrimaryButton onClick={handleDeleteConfirm} text="Delete" />
          <DefaultButton onClick={handleDialogCancel} text="Cancel" />
        </DialogFooter>
      </Dialog>
    </div>
  );
};
